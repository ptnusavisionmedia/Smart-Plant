// Smart Plant Emergency Detector — ESP32 firmware entrypoint (T-27..T-31).
//
// Wires together: sensor drivers, the local control engine (mirrors
// packages/shared/src/watering-policy.ts), pump + emergency interlock,
// NVS-backed config store, the offline buffer, WiFi, MQTT and provisioning.
//
// setup() brings every module up (pump always starts OFF); loop() runs a
// non-blocking cycle: service WiFi/MQTT, tick the pump watchdog and
// emergency debounce every iteration, and run the sensor-read + auto-
// watering-decision + telemetry-publish cycle once per telemetryIntervalSeconds.

#include <Arduino.h>
#include <ArduinoJson.h>

#include "../include/config.h"
#include "sensors/sensors.h"
#include "sensors/dht.h"
#include "sensors/soil.h"
#include "sensors/ultrasonic.h"
#include "sensors/float_switch.h"
#include "control/control_engine.h"
#include "control/config_store.h"
#include "control/pump.h"
#include "control/emergency.h"
#include "network/wifi.h"
#include "network/mqtt.h"
#include "network/provisioning.h"
#include "network/time_util.h"

namespace {

// Rolling history of the last DEBOUNCE_SAMPLE_COUNT soil readings
// (oldest-first), used by isSoilPersistentlyLow() — mirrors the backend's
// "ambil 3 pembacaan terakhir" (Tech Spec §4.3 step 5 / §4.4 step 3).
float g_soilHistory[DEBOUNCE_SAMPLE_COUNT];
int g_soilHistoryCount = 0;

long long g_lastWateringEndedAtMs = -1; // -1 = never watered
unsigned long g_lastTelemetryMs = 0;
bool g_manualStopFlag = false;
int g_pendingManualDurationSeconds = -1; // set by a `pump start` command

void pushSoilSample(float value) {
    if (g_soilHistoryCount < DEBOUNCE_SAMPLE_COUNT) {
        g_soilHistory[g_soilHistoryCount++] = value;
        return;
    }
    for (int i = 1; i < DEBOUNCE_SAMPLE_COUNT; i++) g_soilHistory[i - 1] = g_soilHistory[i];
    g_soilHistory[DEBOUNCE_SAMPLE_COUNT - 1] = value;
}

WaterSafetyContext buildWaterSafetyContext(const DeviceConfig& cfg, float waterLevelPercent, bool floatSwitchLow) {
    WaterSafetyContext w;
    w.waterLevelSource = cfg.waterLevelSource;
    w.waterLevel = waterLevelPercent;
    w.floatSwitchLow = floatSwitchLow;
    w.thresholds = cfg.water;
    return w;
}

SensorReading readAllSensors(const DeviceConfig& cfg, bool floatSwitchLow) {
    SensorReading r;
    r.timestampMs = time_util::nowEpochMs();
    r.pumpOn = pump.isOn();

    float t = NAN, h = NAN;
    dht_sensor::read(t, h);
    r.temperature = t;
    r.humidity = h;

    r.soilMoisture = soil_sensor::readPercent();

    if (cfg.waterLevelSource == WaterLevelSource::FloatSwitch) {
        r.waterLevelSource = WaterLevelSource::FloatSwitch;
        r.waterLevel = floatSwitchLow ? 0.0f : 100.0f; // float switch is binary; ultrasonic %, if also fitted, is reported separately via waterLevelCm
        r.waterLevelCm = NAN;
    } else {
        ultrasonic_sensor::Result u = ultrasonic_sensor::read(cfg.tankHeightCm, cfg.tankMaxLevelCm);
        r.waterLevelSource = WaterLevelSource::Ultrasonic;
        r.waterLevel = u.levelPercent;
        r.waterLevelCm = u.distanceCm;
    }

    return r;
}

void runAutoWateringDecision(const DeviceConfig& cfg, const SensorReading& reading, bool floatSwitchLow) {
    if (pump.isOn()) {
        PumpRunningContext running;
        running.currentSoilMoisture = reading.soilMoisture;
        running.targetMoisture = cfg.targetMoisture;
        running.pumpElapsedSeconds = pump.elapsedSeconds();
        running.maxPumpSeconds = cfg.maxPumpSeconds;
        running.water = buildWaterSafetyContext(cfg, reading.waterLevel, floatSwitchLow);
        running.emergencyLatched = emergencyLatch.isLatched();
        running.manualStopRequested = g_manualStopFlag;

        PumpStopDecision decision = shouldStopPump(running);
        if (decision.stop) {
            pump.stop(decision.reason);
            g_lastWateringEndedAtMs = static_cast<long long>(time_util::nowEpochMs());
            g_manualStopFlag = false;
        }
        return;
    }

    if (g_pendingManualDurationSeconds > 0) {
        // Manual `pump start` command always takes priority over auto mode,
        // as long as it is not blocked by water-low/emergency (mirrors
        // validateManualWatering — the equivalent API-side check).
        ManualWateringContext manual;
        manual.durationSeconds = g_pendingManualDurationSeconds;
        manual.maxPumpSeconds = cfg.maxPumpSeconds;
        manual.emergencyLatched = emergencyLatch.isLatched();
        manual.water = buildWaterSafetyContext(cfg, reading.waterLevel, floatSwitchLow);
        manual.isOnline = true; // local decision; firmware always considers itself "online" to itself
        WateringDecision decision = validateManualWatering(manual);
        if (decision.allowed) {
            pump.start(manual.durationSeconds, cfg.maxPumpSeconds);
        }
        g_pendingManualDurationSeconds = -1;
        return;
    }

    AutoWateringContext autoCtx;
    autoCtx.autoMode = config_store::autoMode();
    autoCtx.emergencyLatched = emergencyLatch.isLatched();
    autoCtx.configAccepted = config_store::isAccepted();
    autoCtx.water = buildWaterSafetyContext(cfg, reading.waterLevel, floatSwitchLow);
    autoCtx.soilMoistureSamplesOldestFirst = g_soilHistory;
    autoCtx.soilSampleCount = g_soilHistoryCount;
    autoCtx.soilThresholds = cfg.soil;
    autoCtx.lastWateringEndedAtMs = g_lastWateringEndedAtMs;
    autoCtx.cooldownSeconds = cfg.cooldownSeconds;
    autoCtx.nowMs = static_cast<long long>(time_util::nowEpochMs());

    WateringDecision decision = canStartAutoWatering(autoCtx);
    if (decision.allowed) {
        pump.start(cfg.maxPumpSeconds, cfg.maxPumpSeconds); // run until target/water/emergency stops it, capped at maxPumpSeconds
    }
}

void publishStateSnapshot(const DeviceConfig& cfg) {
    mqtt_client::publishState(
        pump.isOn(),
        config_store::autoMode(),
        emergencyLatch.isLatched(),
        cfg.configVersion,
        time_util::nowIso8601());
}

// Dispatches a parsed `sp/{deviceId}/command` payload (discriminated union
// on "type", matching packages/shared/src/schemas/command.ts exactly).
void handleCommand(const String& payload) {
    JsonDocument doc;
    if (deserializeJson(doc, payload) != DeserializationError::Ok) return;

    const char* id = doc["id"] | "";
    const char* type = doc["type"] | "";

    if (strcmp(type, "pump") == 0) {
        const char* action = doc["action"] | "";
        if (strcmp(action, "start") == 0) {
            int duration = doc["durationSeconds"] | config_store::current().maxPumpSeconds;
            g_pendingManualDurationSeconds = duration;
            mqtt_client::publishAck(id, true, "accepted");
        } else if (strcmp(action, "stop") == 0) {
            g_manualStopFlag = true;
            mqtt_client::publishAck(id, true, "accepted");
        } else {
            mqtt_client::publishAck(id, false, "rejected", "unknown pump action");
        }
        return;
    }

    if (strcmp(type, "emergency_stop") == 0) {
        emergencyLatch.setLatched(true);
        if (pump.isOn()) pump.stop(PumpStopReason::EmergencyStop);
        config_store::setAutoMode(false);
        mqtt_client::publishAck(id, true, "accepted");
        publishStateSnapshot(config_store::current());
        return;
    }

    if (strcmp(type, "emergency_reset") == 0) {
        bool resumeAutoMode = doc["resumeAutoMode"] | false;
        emergencyLatch.reset();
        if (resumeAutoMode) config_store::setAutoMode(true);
        mqtt_client::publishAck(id, true, "accepted");
        publishStateSnapshot(config_store::current());
        return;
    }

    if (strcmp(type, "config") == 0) {
        String configJson;
        serializeJson(doc["config"], configJson);
        bool applied = config_store::applyFromJson(configJson.c_str());
        mqtt_client::publishAck(id, applied, applied ? "accepted" : "rejected", applied ? "" : "invalid config payload");
        if (applied) publishStateSnapshot(config_store::current());
        return;
    }

    mqtt_client::publishAck(id, false, "rejected", "unknown command type");
}

} // namespace

void setup() {
    Serial.begin(115200);
    delay(200);

    config_store::begin();
    provisioning::begin();

    pump.begin();           // never auto-activates on boot
    emergencyLatch.begin();

    dht_sensor::begin();
    soil_sensor::begin();
    ultrasonic_sensor::begin();
    float_switch::begin();

    wifi_net::begin();
    mqtt_client::begin(provisioning::deviceUid());
    mqtt_client::setCommandHandler(handleCommand);
}

void loop() {
    wifi_net::loop();
    mqtt_client::loop();

    pump.tick();        // watchdog: force-off at max+5s regardless of control engine
    emergencyLatch.tick();
    if (emergencyLatch.consumeButtonEdge()) {
        // Physical button press observed this cycle: software mirror of the
        // hardware interlock already cutting pump power directly.
        if (pump.isOn()) pump.stop(PumpStopReason::EmergencyStop);
        config_store::setAutoMode(false);
        publishStateSnapshot(config_store::current());
    }

    const DeviceConfig& cfg = config_store::current();
    unsigned long intervalMs = static_cast<unsigned long>(cfg.telemetryIntervalSeconds) * 1000UL;
    unsigned long now = millis();

    bool floatSwitchLow = float_switch::isLow();

    // Run the watering decision every loop iteration so a manual stop or
    // emergency latch takes effect immediately, not just once per telemetry
    // interval.
    {
        SensorReading quickRead;
        quickRead.soilMoisture = g_soilHistoryCount > 0 ? g_soilHistory[g_soilHistoryCount - 1] : NAN;
        if (cfg.waterLevelSource == WaterLevelSource::FloatSwitch) {
            quickRead.waterLevelSource = WaterLevelSource::FloatSwitch;
            quickRead.waterLevel = floatSwitchLow ? 0.0f : 100.0f;
        }
        runAutoWateringDecision(cfg, quickRead, floatSwitchLow);
    }

    if (g_lastTelemetryMs == 0 || (now - g_lastTelemetryMs) >= intervalMs) {
        g_lastTelemetryMs = now;

        SensorReading reading = readAllSensors(cfg, floatSwitchLow);
        if (hasValue(reading.soilMoisture)) pushSoilSample(reading.soilMoisture);
        else pushSoilSample(NAN); // a failed read also breaks the debounce streak, matching isSoilPersistentlyLow()

        runAutoWateringDecision(cfg, reading, floatSwitchLow);
        reading.pumpOn = pump.isOn();

        mqtt_client::publishTelemetry(reading, time_util::nowIso8601());
        publishStateSnapshot(cfg);
    }
}
