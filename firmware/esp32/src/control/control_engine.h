#pragma once
#include <cmath>
#include "../sensors/sensors.h"
#include "../../include/config.h"

// ---------------------------------------------------------------------------
// Local auto-watering decision engine — a line-for-line C++ port of
// packages/shared/src/watering-policy.ts (Tech Spec §4.4). Keep this file's
// logic identical to that TS module; any behavioral change must be mirrored
// on both sides. No Arduino dependency — this is what the native unit tests
// exercise.
//
// Deviation from the TS source: `isWaterSafe`'s float-switch branch is keyed
// purely on `waterLevelSource == FloatSwitch` (not an extra "is this field
// defined" check) because the firmware's own float switch driver always has
// a live reading when that source is selected — there is no "backend cache
// might be stale" case to model here.
// ---------------------------------------------------------------------------

struct RangeThresholds {
    float criticalLow;
    float warningLow;
    float warningHigh;
    float criticalHigh;
};

struct WaterThresholds {
    float warningLow;
    float criticalLow;
};

enum class WateringRejectReason {
    None,
    WaterLow,
    EmergencyStop,
    DeviceOffline,
    ConfigNotAccepted,
    AutoModeOff,
    CooldownActive,
    SoilNotLow,
    InvalidDuration,
};

enum class PumpStopReason {
    None,
    TargetReached,
    MaxDurationReached,
    WaterLow,
    EmergencyStop,
    ManualStop,
};

struct WaterSafetyContext {
    float waterLevel = NAN;             // percent, NAN = sensor failed (fail-safe: unsafe)
    WaterLevelSource waterLevelSource = WaterLevelSource::Ultrasonic;
    bool floatSwitchLow = false;        // only meaningful when waterLevelSource == FloatSwitch
    WaterThresholds thresholds{};
};

// Fail-safe: a float switch, when present, is authoritative; a failed
// ultrasonic read (NAN) is never treated as safe (Tech Spec §4.10 step 5).
bool isWaterSafe(const WaterSafetyContext& ctx);

// True once the last `requiredSampleCount` consecutive soil readings
// (oldest-first, NAN entries break the streak) are all <= warningLow.
bool isSoilPersistentlyLow(
    const float* samplesOldestFirst,
    int sampleCountAvailable,
    float warningLow,
    int requiredSampleCount = DEBOUNCE_SAMPLE_COUNT);

bool isCooldownActive(long long lastWateringEndedAtMs, int cooldownSeconds, long long nowMs);

bool isDeviceOnline(
    long long lastSeenAtMs,
    int telemetryIntervalSeconds,
    long long nowMs,
    int multiplier = OFFLINE_MULTIPLIER);

struct AutoWateringContext {
    bool autoMode = false;
    bool emergencyLatched = false;
    bool configAccepted = false;
    WaterSafetyContext water;
    const float* soilMoistureSamplesOldestFirst = nullptr;
    int soilSampleCount = 0;
    RangeThresholds soilThresholds{};
    long long lastWateringEndedAtMs = -1; // -1 = never watered
    int cooldownSeconds = 0;
    long long nowMs = 0;
};

struct WateringDecision {
    bool allowed;
    WateringRejectReason reason;
};

// Mirrors the firmware's local auto-watering decision (Tech Spec §4.4 steps 1-4).
WateringDecision canStartAutoWatering(const AutoWateringContext& ctx);

struct PumpRunningContext {
    float currentSoilMoisture = NAN;
    float targetMoisture = DEFAULT_TARGET_MOISTURE;
    int pumpElapsedSeconds = 0;
    int maxPumpSeconds = DEFAULT_MAX_PUMP_SECONDS;
    WaterSafetyContext water;
    bool emergencyLatched = false;
    bool manualStopRequested = false;
};

struct PumpStopDecision {
    bool stop;
    PumpStopReason reason;
};

// Mirrors the firmware's local pump-stop decision (Tech Spec §4.4 step 6).
PumpStopDecision shouldStopPump(const PumpRunningContext& ctx);

struct ManualWateringContext {
    int durationSeconds;
    int maxPumpSeconds;
    bool emergencyLatched;
    WaterSafetyContext water;
    bool isOnline;
};

// Mirrors the API's pre-publish checks for manual watering (Tech Spec §4.5 step 3).
WateringDecision validateManualWatering(const ManualWateringContext& ctx);
