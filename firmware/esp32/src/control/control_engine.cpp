#include "control_engine.h"

bool isWaterSafe(const WaterSafetyContext& ctx) {
    if (ctx.waterLevelSource == WaterLevelSource::FloatSwitch) {
        return !ctx.floatSwitchLow;
    }
    if (std::isnan(ctx.waterLevel)) return false;
    return ctx.waterLevel >= ctx.thresholds.criticalLow;
}

bool isSoilPersistentlyLow(
    const float* samples,
    int count,
    float warningLow,
    int requiredSampleCount) {
    if (count < requiredSampleCount) return false;
    for (int i = count - requiredSampleCount; i < count; i++) {
        if (std::isnan(samples[i]) || samples[i] > warningLow) return false;
    }
    return true;
}

bool isCooldownActive(long long lastWateringEndedAtMs, int cooldownSeconds, long long nowMs) {
    if (lastWateringEndedAtMs < 0) return false;
    return (nowMs - lastWateringEndedAtMs) < static_cast<long long>(cooldownSeconds) * 1000;
}

bool isDeviceOnline(
    long long lastSeenAtMs,
    int telemetryIntervalSeconds,
    long long nowMs,
    int multiplier) {
    if (lastSeenAtMs < 0) return false;
    return (nowMs - lastSeenAtMs) <= static_cast<long long>(telemetryIntervalSeconds) * 1000 * multiplier;
}

WateringDecision canStartAutoWatering(const AutoWateringContext& ctx) {
    if (!ctx.configAccepted) return { false, WateringRejectReason::ConfigNotAccepted };
    if (!ctx.autoMode) return { false, WateringRejectReason::AutoModeOff };
    if (ctx.emergencyLatched) return { false, WateringRejectReason::EmergencyStop };
    if (!isWaterSafe(ctx.water)) return { false, WateringRejectReason::WaterLow };
    if (!isSoilPersistentlyLow(
            ctx.soilMoistureSamplesOldestFirst,
            ctx.soilSampleCount,
            ctx.soilThresholds.warningLow)) {
        return { false, WateringRejectReason::SoilNotLow };
    }
    if (isCooldownActive(ctx.lastWateringEndedAtMs, ctx.cooldownSeconds, ctx.nowMs)) {
        return { false, WateringRejectReason::CooldownActive };
    }
    return { true, WateringRejectReason::None };
}

PumpStopDecision shouldStopPump(const PumpRunningContext& ctx) {
    if (ctx.manualStopRequested) return { true, PumpStopReason::ManualStop };
    if (ctx.emergencyLatched) return { true, PumpStopReason::EmergencyStop };
    if (!isWaterSafe(ctx.water)) return { true, PumpStopReason::WaterLow };
    if (ctx.pumpElapsedSeconds >= ctx.maxPumpSeconds) {
        return { true, PumpStopReason::MaxDurationReached };
    }
    if (!std::isnan(ctx.currentSoilMoisture) && ctx.currentSoilMoisture >= ctx.targetMoisture) {
        return { true, PumpStopReason::TargetReached };
    }
    return { false, PumpStopReason::None };
}

WateringDecision validateManualWatering(const ManualWateringContext& ctx) {
    if (ctx.durationSeconds < 1 || ctx.durationSeconds > ctx.maxPumpSeconds) {
        return { false, WateringRejectReason::InvalidDuration };
    }
    if (!ctx.isOnline) return { false, WateringRejectReason::DeviceOffline };
    if (ctx.emergencyLatched) return { false, WateringRejectReason::EmergencyStop };
    if (!isWaterSafe(ctx.water)) return { false, WateringRejectReason::WaterLow };
    return { true, WateringRejectReason::None };
}
