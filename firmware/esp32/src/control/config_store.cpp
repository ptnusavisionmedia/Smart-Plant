#include "config_store.h"
#include <Arduino.h>
#include <ArduinoJson.h>
#include <Preferences.h>

namespace config_store {

namespace {
DeviceConfig g_config; // defaults until load()/applyFromJson() runs
bool g_autoMode = false; // DEFAULT_AUTO_MODE: starts OFF (packages/shared/src/constants.ts)

void persist() {
    Preferences prefs;
    prefs.begin("devcfg", false);

    JsonDocument doc;
    doc["soil"]["criticalLow"] = g_config.soil.criticalLow;
    doc["soil"]["warningLow"] = g_config.soil.warningLow;
    doc["soil"]["warningHigh"] = g_config.soil.warningHigh;
    doc["soil"]["criticalHigh"] = g_config.soil.criticalHigh;
    doc["temp"]["criticalLow"] = g_config.temp.criticalLow;
    doc["temp"]["warningLow"] = g_config.temp.warningLow;
    doc["temp"]["warningHigh"] = g_config.temp.warningHigh;
    doc["temp"]["criticalHigh"] = g_config.temp.criticalHigh;
    doc["humidity"]["criticalLow"] = g_config.humidity.criticalLow;
    doc["humidity"]["warningLow"] = g_config.humidity.warningLow;
    doc["humidity"]["warningHigh"] = g_config.humidity.warningHigh;
    doc["humidity"]["criticalHigh"] = g_config.humidity.criticalHigh;
    doc["water"]["warningLow"] = g_config.water.warningLow;
    doc["water"]["criticalLow"] = g_config.water.criticalLow;
    doc["targetMoisture"] = g_config.targetMoisture;
    doc["maxPumpSeconds"] = g_config.maxPumpSeconds;
    doc["cooldownSeconds"] = g_config.cooldownSeconds;
    doc["telemetryIntervalSeconds"] = g_config.telemetryIntervalSeconds;
    doc["waterLevelSource"] = waterLevelSourceToString(g_config.waterLevelSource);
    doc["tankHeightCm"] = g_config.tankHeightCm;
    doc["tankMaxLevelCm"] = g_config.tankMaxLevelCm;
    doc["configVersion"] = g_config.configVersion;
    doc["autoMode"] = g_autoMode;

    String out;
    serializeJson(doc, out);
    prefs.putString("json", out);
    prefs.end();
}
} // namespace

void begin() {
    load();
}

const DeviceConfig& current() { return g_config; }

void load() {
    Preferences prefs;
    prefs.begin("devcfg", /*readOnly=*/true);
    String stored = prefs.getString("json", "");
    prefs.end();

    if (stored.length() == 0) {
        return; // keep factory defaults, configVersion stays 0 (not accepted)
    }

    JsonDocument doc;
    if (deserializeJson(doc, stored) != DeserializationError::Ok) {
        return;
    }

    g_config.soil = {
        doc["soil"]["criticalLow"] | g_config.soil.criticalLow,
        doc["soil"]["warningLow"] | g_config.soil.warningLow,
        doc["soil"]["warningHigh"] | g_config.soil.warningHigh,
        doc["soil"]["criticalHigh"] | g_config.soil.criticalHigh,
    };
    g_config.temp = {
        doc["temp"]["criticalLow"] | g_config.temp.criticalLow,
        doc["temp"]["warningLow"] | g_config.temp.warningLow,
        doc["temp"]["warningHigh"] | g_config.temp.warningHigh,
        doc["temp"]["criticalHigh"] | g_config.temp.criticalHigh,
    };
    g_config.humidity = {
        doc["humidity"]["criticalLow"] | g_config.humidity.criticalLow,
        doc["humidity"]["warningLow"] | g_config.humidity.warningLow,
        doc["humidity"]["warningHigh"] | g_config.humidity.warningHigh,
        doc["humidity"]["criticalHigh"] | g_config.humidity.criticalHigh,
    };
    g_config.water = {
        doc["water"]["warningLow"] | g_config.water.warningLow,
        doc["water"]["criticalLow"] | g_config.water.criticalLow,
    };
    g_config.targetMoisture = doc["targetMoisture"] | g_config.targetMoisture;
    g_config.maxPumpSeconds = doc["maxPumpSeconds"] | g_config.maxPumpSeconds;
    g_config.cooldownSeconds = doc["cooldownSeconds"] | g_config.cooldownSeconds;
    g_config.telemetryIntervalSeconds = doc["telemetryIntervalSeconds"] | g_config.telemetryIntervalSeconds;
    const char* src = doc["waterLevelSource"] | "ultrasonic";
    g_config.waterLevelSource = (String(src) == "float_switch") ? WaterLevelSource::FloatSwitch : WaterLevelSource::Ultrasonic;
    g_config.tankHeightCm = doc["tankHeightCm"] | g_config.tankHeightCm;
    g_config.tankMaxLevelCm = doc["tankMaxLevelCm"] | g_config.tankMaxLevelCm;
    g_config.configVersion = doc["configVersion"] | g_config.configVersion;
    g_autoMode = doc["autoMode"] | false;
}

bool applyFromJson(const char* jsonConfig) {
    JsonDocument doc;
    if (deserializeJson(doc, jsonConfig) != DeserializationError::Ok) return false;
    if (!doc["configVersion"].is<int>()) return false;

    DeviceConfig next = g_config;
    next.soil = {
        doc["thresholds"]["soil"]["criticalLow"] | next.soil.criticalLow,
        doc["thresholds"]["soil"]["warningLow"] | next.soil.warningLow,
        doc["thresholds"]["soil"]["warningHigh"] | next.soil.warningHigh,
        doc["thresholds"]["soil"]["criticalHigh"] | next.soil.criticalHigh,
    };
    next.temp = {
        doc["thresholds"]["temp"]["criticalLow"] | next.temp.criticalLow,
        doc["thresholds"]["temp"]["warningLow"] | next.temp.warningLow,
        doc["thresholds"]["temp"]["warningHigh"] | next.temp.warningHigh,
        doc["thresholds"]["temp"]["criticalHigh"] | next.temp.criticalHigh,
    };
    next.humidity = {
        doc["thresholds"]["humidity"]["criticalLow"] | next.humidity.criticalLow,
        doc["thresholds"]["humidity"]["warningLow"] | next.humidity.warningLow,
        doc["thresholds"]["humidity"]["warningHigh"] | next.humidity.warningHigh,
        doc["thresholds"]["humidity"]["criticalHigh"] | next.humidity.criticalHigh,
    };
    next.water = {
        doc["thresholds"]["water"]["warningLow"] | next.water.warningLow,
        doc["thresholds"]["water"]["criticalLow"] | next.water.criticalLow,
    };
    next.targetMoisture = doc["targetMoisture"] | next.targetMoisture;
    next.maxPumpSeconds = doc["maxPumpSeconds"] | next.maxPumpSeconds;
    next.cooldownSeconds = doc["cooldownSeconds"] | next.cooldownSeconds;
    next.telemetryIntervalSeconds = doc["telemetryIntervalSeconds"] | next.telemetryIntervalSeconds;
    const char* src = doc["waterLevelSource"] | "ultrasonic";
    next.waterLevelSource = (String(src) == "float_switch") ? WaterLevelSource::FloatSwitch : WaterLevelSource::Ultrasonic;
    next.tankHeightCm = doc["tankHeightCm"] | next.tankHeightCm;
    next.tankMaxLevelCm = doc["tankMaxLevelCm"] | next.tankMaxLevelCm;
    next.configVersion = doc["configVersion"].as<int>();

    if (next.configVersion < 1) return false;

    g_config = next;
    persist();
    return true;
}

bool isAccepted() { return g_config.configVersion > 0; }

bool autoMode() { return g_autoMode; }

void setAutoMode(bool enabled) {
    // Safe default: can never be turned on before a config has been accepted.
    g_autoMode = enabled && isAccepted();
    persist();
}

} // namespace config_store
