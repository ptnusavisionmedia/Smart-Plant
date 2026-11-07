#pragma once
#include <cmath>

// ---------------------------------------------------------------------------
// Shared sensor data model. No Arduino dependency — safe for native tests.
// ---------------------------------------------------------------------------

enum class WaterLevelSource { Ultrasonic, FloatSwitch };

inline const char* waterLevelSourceToString(WaterLevelSource s) {
    return s == WaterLevelSource::FloatSwitch ? "float_switch" : "ultrasonic";
}

// A single point-in-time sensor snapshot. Nullable numeric fields (matching
// the nullable numbers in packages/shared/src/schemas/telemetry.ts) use NAN
// as the "no reading" sentinel — check with hasValue()/std::isnan().
struct SensorReading {
    float soilMoisture = NAN;    // 0-100 (%)
    float temperature = NAN;     // Celsius
    float humidity = NAN;        // 0-100 (%)
    float waterLevel = NAN;      // 0-100 (%)
    float waterLevelCm = NAN;    // raw ultrasonic distance-derived level, cm (null when float_switch is authoritative or sensor failed)
    WaterLevelSource waterLevelSource = WaterLevelSource::Ultrasonic;
    bool pumpOn = false;
    unsigned long long timestampMs = 0; // epoch ms (UTC)
    bool historical = false;            // true when replayed from the offline buffer
};

inline bool hasValue(float v) { return !std::isnan(v); }
