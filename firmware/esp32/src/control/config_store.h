#pragma once
#include "control_engine.h"
#include "../sensors/sensors.h"

// ---------------------------------------------------------------------------
// Device configuration mirroring packages/shared/src/schemas/config.ts's
// DeviceConfig, persisted in NVS with a version number (Tech Spec §4.4
// step 8 / T-30): auto mode is forced OFF until a valid config has been
// received AND acknowledged at least once.
// ---------------------------------------------------------------------------
struct DeviceConfig {
    RangeThresholds soil{DEFAULT_SOIL_WARNING_LOW - 15, DEFAULT_SOIL_WARNING_LOW, 71, 85};
    RangeThresholds temp{15, 18, 31, 35};
    RangeThresholds humidity{40, 50, 71, 80};
    WaterThresholds water{DEFAULT_WATER_WARNING_LOW, DEFAULT_WATER_CRITICAL_LOW};
    float targetMoisture = DEFAULT_TARGET_MOISTURE;
    int maxPumpSeconds = DEFAULT_MAX_PUMP_SECONDS;
    int cooldownSeconds = DEFAULT_COOLDOWN_SECONDS;
    int telemetryIntervalSeconds = DEFAULT_TELEMETRY_INTERVAL_SECONDS;
    WaterLevelSource waterLevelSource = WaterLevelSource::Ultrasonic;
    float tankHeightCm = DEFAULT_TANK_HEIGHT_CM;
    float tankMaxLevelCm = DEFAULT_TANK_MAX_LEVEL_CM;
    int configVersion = 0; // 0 = never received/accepted a config from the server
};

namespace config_store {

void begin();

// Current in-memory config (defaults until a real one is loaded/applied).
const DeviceConfig& current();

// Loads any previously-persisted config from NVS into current(). No-op (and
// leaves configVersion=0 / auto mode off) if nothing was ever saved.
void load();

// Applies + persists a config received via the `config` MQTT command.
// Always sets configVersion > 0, which is what makes auto mode eligible to
// run (Tech Spec §4.4 step 8). Returns false (and does not apply) if
// jsonConfig fails to parse as the expected shape.
bool applyFromJson(const char* jsonConfig);

// True once a config with configVersion > 0 has been applied at least once.
bool isAccepted();

// autoMode is tracked separately from the config itself (it can be toggled
// independently via emergency_reset's resumeAutoMode, and always starts
// false until accepted() — Tech Spec §4.4 step 8 / packages/shared's
// DEFAULT_AUTO_MODE).
bool autoMode();
void setAutoMode(bool enabled);

} // namespace config_store
