#include "mqtt.h"
#include "wifi.h"
#include "time_util.h"
#include "../control/offline_buffer.h"
#include "../../include/config.h"
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <WiFi.h>
#if MQTT_USE_TLS
#include <WiFiClientSecure.h>
#endif

namespace mqtt_client {

namespace {

#if MQTT_USE_TLS
WiFiClientSecure g_netClient;
#else
WiFiClient g_netClient;
#endif
PubSubClient g_mqtt(g_netClient);

String g_deviceUid;
String g_topicTelemetry, g_topicPresence, g_topicCommand, g_topicAck, g_topicState;
CommandHandler g_commandHandler;
unsigned long g_lastReconnectAttemptMs = 0;
OfflineBuffer g_offlineBuffer(OFFLINE_BUFFER_CAPACITY);

String buildTelemetryJson(const SensorReading& reading, const String& isoTimestamp) {
    JsonDocument doc;
    doc["deviceUid"] = g_deviceUid;
    doc["ts"] = isoTimestamp;
    if (!std::isnan(reading.soilMoisture)) doc["soilMoisture"] = reading.soilMoisture; else doc["soilMoisture"] = nullptr;
    if (!std::isnan(reading.temperature)) doc["temperature"] = reading.temperature; else doc["temperature"] = nullptr;
    if (!std::isnan(reading.humidity)) doc["humidity"] = reading.humidity; else doc["humidity"] = nullptr;
    if (!std::isnan(reading.waterLevel)) doc["waterLevel"] = reading.waterLevel; else doc["waterLevel"] = nullptr;
    if (!std::isnan(reading.waterLevelCm)) doc["waterLevelCm"] = reading.waterLevelCm; else doc["waterLevelCm"] = nullptr;
    doc["waterLevelSource"] = waterLevelSourceToString(reading.waterLevelSource);
    doc["pumpOn"] = reading.pumpOn;
    doc["firmwareVersion"] = FIRMWARE_VERSION;
    doc["historical"] = reading.historical;

    String out;
    serializeJson(doc, out);
    return out;
}

void onMessage(char* topic, uint8_t* payload, unsigned int length) {
    String body;
    body.reserve(length);
    for (unsigned int i = 0; i < length; i++) body += static_cast<char>(payload[i]);

    if (String(topic) == g_topicCommand && g_commandHandler) {
        g_commandHandler(body);
    }
}

bool connect() {
#if MQTT_USE_TLS
    // NOTE: for a real deployment, pin the broker's CA certificate here via
    // g_netClient.setCACert(...). Left insecure-by-default so this builds
    // without a bundled cert; see WOKWI.md / README for production notes.
    g_netClient.setInsecure();
#endif
    g_mqtt.setServer(MQTT_HOST, MQTT_PORT);
    g_mqtt.setKeepAlive(MQTT_KEEPALIVE_SECONDS);
    g_mqtt.setCallback(onMessage);

    // LWT: presence topic, retained, payload "offline" (Tech Spec §4.9).
    bool ok = g_mqtt.connect(
        g_deviceUid.c_str(),
        /*user=*/g_deviceUid.c_str(),
        /*pass=*/nullptr,
        g_topicPresence.c_str(),
        /*willQos=*/MQTT_QOS,
        /*willRetain=*/true,
        "offline");

    if (ok) {
        g_mqtt.publish(g_topicPresence.c_str(), "online", /*retained=*/true);
        g_mqtt.subscribe(g_topicCommand.c_str(), MQTT_QOS);
    }
    return ok;
}

void replayOfflineBuffer() {
    // Tech Spec §4.9: replay buffered readings in order, with their
    // original timestamps and historical=true.
    SensorReading reading;
    while (!g_offlineBuffer.isEmpty() && g_offlineBuffer.pop(reading)) {
        reading.historical = true;
        String isoTs = time_util::iso8601FromEpochMs(reading.timestampMs);
        String json = buildTelemetryJson(reading, isoTs);
        g_mqtt.publish(g_topicTelemetry.c_str(), json.c_str(), /*retained=*/false);
    }
}

} // namespace

void begin(const String& deviceUid) {
    g_deviceUid = deviceUid;
    g_topicTelemetry = "sp/" + deviceUid + "/telemetry";
    g_topicPresence = "sp/" + deviceUid + "/presence";
    g_topicCommand = "sp/" + deviceUid + "/command";
    g_topicAck = "sp/" + deviceUid + "/ack";
    g_topicState = "sp/" + deviceUid + "/state";
}

void setCommandHandler(CommandHandler handler) {
    g_commandHandler = handler;
}

bool isConnected() {
    return g_mqtt.connected();
}

void loop() {
    if (!wifi_net::isConnected()) return;

    if (!g_mqtt.connected()) {
        unsigned long now = millis();
        if (now - g_lastReconnectAttemptMs >= MQTT_RECONNECT_DELAY_MS) {
            g_lastReconnectAttemptMs = now;
            if (connect()) {
                replayOfflineBuffer();
            }
        }
        return;
    }

    g_mqtt.loop();
}

void publishTelemetry(const SensorReading& reading, const String& isoTimestamp) {
    if (!g_mqtt.connected()) {
        // Tech Spec §4.9: buffer up to 100 readings in RAM while MQTT is
        // down; the ring buffer itself handles the 100-reading cap.
        g_offlineBuffer.push(reading);
        return;
    }
    String out = buildTelemetryJson(reading, isoTimestamp);
    g_mqtt.publish(g_topicTelemetry.c_str(), out.c_str(), /*retained=*/false);
}

void publishAck(const String& id, bool ok, const String& state, const String& error) {
    if (!g_mqtt.connected()) return;
    JsonDocument doc;
    doc["id"] = id;
    doc["ok"] = ok;
    doc["state"] = state;
    if (error.length() > 0) doc["error"] = error;

    String out;
    serializeJson(doc, out);
    g_mqtt.publish(g_topicAck.c_str(), out.c_str(), /*retained=*/false);
}

void publishState(bool pumpOn, bool autoMode, bool emergencyLatched, int configVersion, const String& isoTimestamp) {
    if (!g_mqtt.connected()) return;
    JsonDocument doc;
    doc["pumpOn"] = pumpOn;
    doc["autoMode"] = autoMode;
    doc["emergencyLatched"] = emergencyLatched;
    doc["configVersion"] = configVersion;
    doc["ts"] = isoTimestamp;

    String out;
    serializeJson(doc, out);
    g_mqtt.publish(g_topicState.c_str(), out.c_str(), /*retained=*/true);
}

} // namespace mqtt_client
