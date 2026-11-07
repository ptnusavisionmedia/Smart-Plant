// Unity tests for control/control_engine.cpp — ported boundary cases from
// packages/shared/src/watering-policy.test.ts (same thresholds: soil
// warningLow=40 of 25/40/71/85, water criticalLow=15/warningLow=30 of
// 15/30, debounce of 3, cooldown, emergency latch).
#include <unity.h>
#include "control/control_engine.h"

void setUp() {}
void tearDown() {}

namespace {
// Mirrors the TS test file's shared `thresholds` fixture exactly.
WaterThresholds waterThresholds() { return { /*warningLow=*/30.0f, /*criticalLow=*/15.0f }; }
RangeThresholds soilThresholds() { return { /*criticalLow=*/25.0f, /*warningLow=*/40.0f, /*warningHigh=*/71.0f, /*criticalHigh=*/85.0f }; }

AutoWateringContext baseAutoCtx() {
    AutoWateringContext ctx;
    ctx.autoMode = true;
    ctx.emergencyLatched = false;
    ctx.configAccepted = true;
    ctx.water.waterLevel = 60.0f;
    ctx.water.waterLevelSource = WaterLevelSource::Ultrasonic;
    ctx.water.thresholds = waterThresholds();
    static float samples[3] = {35.0f, 35.0f, 35.0f};
    ctx.soilMoistureSamplesOldestFirst = samples;
    ctx.soilSampleCount = 3;
    ctx.soilThresholds = soilThresholds();
    ctx.lastWateringEndedAtMs = -1;
    ctx.cooldownSeconds = 1800;
    ctx.nowMs = 1000000;
    return ctx;
}
}

// ---- isWaterSafe --------------------------------------------------------

void test_water_unsafe_when_ultrasonic_null() {
    WaterSafetyContext w;
    w.waterLevel = NAN;
    w.waterLevelSource = WaterLevelSource::Ultrasonic;
    w.thresholds = waterThresholds();
    TEST_ASSERT_FALSE(isWaterSafe(w));
}

void test_water_unsafe_below_criticalLow_14() {
    WaterSafetyContext w;
    w.waterLevel = 14.0f;
    w.waterLevelSource = WaterLevelSource::Ultrasonic;
    w.thresholds = waterThresholds();
    TEST_ASSERT_FALSE(isWaterSafe(w));
}

void test_water_safe_at_exactly_criticalLow_15() {
    WaterSafetyContext w;
    w.waterLevel = 15.0f;
    w.waterLevelSource = WaterLevelSource::Ultrasonic;
    w.thresholds = waterThresholds();
    TEST_ASSERT_TRUE(isWaterSafe(w));
}

void test_water_safe_at_warningLow_30_marker_only() {
    // 30 == warningLow is a UI marker only; isWaterSafe only cares about criticalLow.
    WaterSafetyContext w;
    w.waterLevel = 30.0f;
    w.waterLevelSource = WaterLevelSource::Ultrasonic;
    w.thresholds = waterThresholds();
    TEST_ASSERT_TRUE(isWaterSafe(w));
}

void test_float_switch_authoritative_over_ultrasonic() {
    WaterSafetyContext w;
    w.waterLevel = 90.0f; // ultrasonic would say "plenty"
    w.waterLevelSource = WaterLevelSource::FloatSwitch;
    w.floatSwitchLow = true;
    w.thresholds = waterThresholds();
    TEST_ASSERT_FALSE(isWaterSafe(w));
}

// ---- isSoilPersistentlyLow (debounce of 3) -------------------------------

void test_debounce_requires_3_consecutive_at_or_below_warningLow_40() {
    float a[3] = {50.0f, 35.0f, 35.0f};
    TEST_ASSERT_FALSE(isSoilPersistentlyLow(a, 3, 40.0f)); // only 2 of the last 3

    float b[3] = {35.0f, 35.0f, 35.0f};
    TEST_ASSERT_TRUE(isSoilPersistentlyLow(b, 3, 40.0f));

    float c[2] = {35.0f, 35.0f};
    TEST_ASSERT_FALSE(isSoilPersistentlyLow(c, 2, 40.0f)); // not enough samples yet
}

void test_debounce_boundary_exactly_at_warningLow_40_counts_as_low() {
    float a[3] = {40.0f, 40.0f, 40.0f};
    TEST_ASSERT_TRUE(isSoilPersistentlyLow(a, 3, 40.0f));
}

void test_debounce_boundary_just_above_warningLow_breaks_streak() {
    float a[3] = {40.0f, 40.0f, 41.0f};
    TEST_ASSERT_FALSE(isSoilPersistentlyLow(a, 3, 40.0f));
}

void test_debounce_null_sample_breaks_streak() {
    float a[3] = {35.0f, NAN, 35.0f};
    TEST_ASSERT_FALSE(isSoilPersistentlyLow(a, 3, 40.0f));
}

// ---- isCooldownActive ----------------------------------------------------

void test_cooldown_false_when_never_watered() {
    TEST_ASSERT_FALSE(isCooldownActive(-1, 1800, 1000000));
}

void test_cooldown_true_immediately_after_watering_ends() {
    TEST_ASSERT_TRUE(isCooldownActive(1000000, 1800, 1000000 + 1000));
}

void test_cooldown_false_once_window_elapsed() {
    TEST_ASSERT_FALSE(isCooldownActive(0, 1800, 1800LL * 1000 + 1));
}

// ---- isDeviceOnline (OFFLINE_MULTIPLIER = 3) ------------------------------

void test_device_offline_past_3x_interval() {
    TEST_ASSERT_FALSE(isDeviceOnline(0, 30, 30000LL * 3 + 1));
}

void test_device_online_within_3x_interval() {
    TEST_ASSERT_TRUE(isDeviceOnline(0, 30, 30000LL * 3));
}

// ---- canStartAutoWatering --------------------------------------------------

void test_auto_allows_when_every_condition_met() {
    WateringDecision d = canStartAutoWatering(baseAutoCtx());
    TEST_ASSERT_TRUE(d.allowed);
}

void test_auto_rejects_when_auto_mode_off() {
    AutoWateringContext ctx = baseAutoCtx();
    ctx.autoMode = false;
    WateringDecision d = canStartAutoWatering(ctx);
    TEST_ASSERT_FALSE(d.allowed);
    TEST_ASSERT_EQUAL(static_cast<int>(WateringRejectReason::AutoModeOff), static_cast<int>(d.reason));
}

void test_auto_rejects_when_config_not_accepted() {
    AutoWateringContext ctx = baseAutoCtx();
    ctx.configAccepted = false;
    WateringDecision d = canStartAutoWatering(ctx);
    TEST_ASSERT_FALSE(d.allowed);
    TEST_ASSERT_EQUAL(static_cast<int>(WateringRejectReason::ConfigNotAccepted), static_cast<int>(d.reason));
}

void test_auto_rejects_when_emergency_latched() {
    AutoWateringContext ctx = baseAutoCtx();
    ctx.emergencyLatched = true;
    WateringDecision d = canStartAutoWatering(ctx);
    TEST_ASSERT_FALSE(d.allowed);
    TEST_ASSERT_EQUAL(static_cast<int>(WateringRejectReason::EmergencyStop), static_cast<int>(d.reason));
}

void test_auto_rejects_when_water_low() {
    AutoWateringContext ctx = baseAutoCtx();
    ctx.water.waterLevel = 5.0f;
    WateringDecision d = canStartAutoWatering(ctx);
    TEST_ASSERT_FALSE(d.allowed);
    TEST_ASSERT_EQUAL(static_cast<int>(WateringRejectReason::WaterLow), static_cast<int>(d.reason));
}

void test_auto_rejects_when_soil_not_persistently_low() {
    AutoWateringContext ctx = baseAutoCtx();
    static float samples[3] = {60.0f, 60.0f, 35.0f};
    ctx.soilMoistureSamplesOldestFirst = samples;
    WateringDecision d = canStartAutoWatering(ctx);
    TEST_ASSERT_FALSE(d.allowed);
    TEST_ASSERT_EQUAL(static_cast<int>(WateringRejectReason::SoilNotLow), static_cast<int>(d.reason));
}

void test_auto_rejects_while_cooldown_active() {
    AutoWateringContext ctx = baseAutoCtx();
    ctx.lastWateringEndedAtMs = 999900;
    ctx.nowMs = 1000000;
    WateringDecision d = canStartAutoWatering(ctx);
    TEST_ASSERT_FALSE(d.allowed);
    TEST_ASSERT_EQUAL(static_cast<int>(WateringRejectReason::CooldownActive), static_cast<int>(d.reason));
}

// ---- shouldStopPump --------------------------------------------------------

namespace {
PumpRunningContext basePumpCtx() {
    PumpRunningContext ctx;
    ctx.currentSoilMoisture = 40.0f;
    ctx.targetMoisture = 55.0f;
    ctx.pumpElapsedSeconds = 10;
    ctx.maxPumpSeconds = 60;
    ctx.water.waterLevel = 60.0f;
    ctx.water.waterLevelSource = WaterLevelSource::Ultrasonic;
    ctx.water.thresholds = waterThresholds();
    ctx.emergencyLatched = false;
    return ctx;
}
}

void test_pump_keeps_running_when_nothing_reached() {
    PumpStopDecision d = shouldStopPump(basePumpCtx());
    TEST_ASSERT_FALSE(d.stop);
}

void test_pump_stops_at_target_moisture_55() {
    PumpRunningContext ctx = basePumpCtx();
    ctx.currentSoilMoisture = 55.0f;
    PumpStopDecision d = shouldStopPump(ctx);
    TEST_ASSERT_TRUE(d.stop);
    TEST_ASSERT_EQUAL(static_cast<int>(PumpStopReason::TargetReached), static_cast<int>(d.reason));
}

void test_pump_stops_at_max_duration_60s() {
    PumpRunningContext ctx = basePumpCtx();
    ctx.pumpElapsedSeconds = 60;
    PumpStopDecision d = shouldStopPump(ctx);
    TEST_ASSERT_TRUE(d.stop);
    TEST_ASSERT_EQUAL(static_cast<int>(PumpStopReason::MaxDurationReached), static_cast<int>(d.reason));
}

void test_pump_stops_immediately_on_water_low() {
    PumpRunningContext ctx = basePumpCtx();
    ctx.water.waterLevel = 5.0f;
    PumpStopDecision d = shouldStopPump(ctx);
    TEST_ASSERT_TRUE(d.stop);
    TEST_ASSERT_EQUAL(static_cast<int>(PumpStopReason::WaterLow), static_cast<int>(d.reason));
}

void test_pump_stops_immediately_on_emergency_latch() {
    PumpRunningContext ctx = basePumpCtx();
    ctx.emergencyLatched = true;
    PumpStopDecision d = shouldStopPump(ctx);
    TEST_ASSERT_TRUE(d.stop);
    TEST_ASSERT_EQUAL(static_cast<int>(PumpStopReason::EmergencyStop), static_cast<int>(d.reason));
}

void test_pump_stops_on_manual_stop_taking_priority() {
    PumpRunningContext ctx = basePumpCtx();
    ctx.manualStopRequested = true;
    ctx.emergencyLatched = true; // even with emergency also true, manual stop reason wins (first check)
    PumpStopDecision d = shouldStopPump(ctx);
    TEST_ASSERT_TRUE(d.stop);
    TEST_ASSERT_EQUAL(static_cast<int>(PumpStopReason::ManualStop), static_cast<int>(d.reason));
}

// ---- validateManualWatering ------------------------------------------------

namespace {
ManualWateringContext baseManualCtx() {
    ManualWateringContext ctx;
    ctx.durationSeconds = 10;
    ctx.maxPumpSeconds = 60;
    ctx.emergencyLatched = false;
    ctx.water.waterLevel = 60.0f;
    ctx.water.waterLevelSource = WaterLevelSource::Ultrasonic;
    ctx.water.thresholds = waterThresholds();
    ctx.isOnline = true;
    return ctx;
}
}

void test_manual_allows_valid_request() {
    WateringDecision d = validateManualWatering(baseManualCtx());
    TEST_ASSERT_TRUE(d.allowed);
}

void test_manual_rejects_duration_above_max_61() {
    ManualWateringContext ctx = baseManualCtx();
    ctx.durationSeconds = 61;
    WateringDecision d = validateManualWatering(ctx);
    TEST_ASSERT_FALSE(d.allowed);
    TEST_ASSERT_EQUAL(static_cast<int>(WateringRejectReason::InvalidDuration), static_cast<int>(d.reason));
}

void test_manual_rejects_when_offline() {
    ManualWateringContext ctx = baseManualCtx();
    ctx.isOnline = false;
    WateringDecision d = validateManualWatering(ctx);
    TEST_ASSERT_FALSE(d.allowed);
    TEST_ASSERT_EQUAL(static_cast<int>(WateringRejectReason::DeviceOffline), static_cast<int>(d.reason));
}

void test_manual_rejects_when_emergency_latched() {
    ManualWateringContext ctx = baseManualCtx();
    ctx.emergencyLatched = true;
    WateringDecision d = validateManualWatering(ctx);
    TEST_ASSERT_FALSE(d.allowed);
    TEST_ASSERT_EQUAL(static_cast<int>(WateringRejectReason::EmergencyStop), static_cast<int>(d.reason));
}

void test_manual_rejects_when_water_low() {
    ManualWateringContext ctx = baseManualCtx();
    ctx.water.waterLevel = 5.0f;
    WateringDecision d = validateManualWatering(ctx);
    TEST_ASSERT_FALSE(d.allowed);
    TEST_ASSERT_EQUAL(static_cast<int>(WateringRejectReason::WaterLow), static_cast<int>(d.reason));
}

int main(int argc, char** argv) {
    UNITY_BEGIN();

    RUN_TEST(test_water_unsafe_when_ultrasonic_null);
    RUN_TEST(test_water_unsafe_below_criticalLow_14);
    RUN_TEST(test_water_safe_at_exactly_criticalLow_15);
    RUN_TEST(test_water_safe_at_warningLow_30_marker_only);
    RUN_TEST(test_float_switch_authoritative_over_ultrasonic);

    RUN_TEST(test_debounce_requires_3_consecutive_at_or_below_warningLow_40);
    RUN_TEST(test_debounce_boundary_exactly_at_warningLow_40_counts_as_low);
    RUN_TEST(test_debounce_boundary_just_above_warningLow_breaks_streak);
    RUN_TEST(test_debounce_null_sample_breaks_streak);

    RUN_TEST(test_cooldown_false_when_never_watered);
    RUN_TEST(test_cooldown_true_immediately_after_watering_ends);
    RUN_TEST(test_cooldown_false_once_window_elapsed);

    RUN_TEST(test_device_offline_past_3x_interval);
    RUN_TEST(test_device_online_within_3x_interval);

    RUN_TEST(test_auto_allows_when_every_condition_met);
    RUN_TEST(test_auto_rejects_when_auto_mode_off);
    RUN_TEST(test_auto_rejects_when_config_not_accepted);
    RUN_TEST(test_auto_rejects_when_emergency_latched);
    RUN_TEST(test_auto_rejects_when_water_low);
    RUN_TEST(test_auto_rejects_when_soil_not_persistently_low);
    RUN_TEST(test_auto_rejects_while_cooldown_active);

    RUN_TEST(test_pump_keeps_running_when_nothing_reached);
    RUN_TEST(test_pump_stops_at_target_moisture_55);
    RUN_TEST(test_pump_stops_at_max_duration_60s);
    RUN_TEST(test_pump_stops_immediately_on_water_low);
    RUN_TEST(test_pump_stops_immediately_on_emergency_latch);
    RUN_TEST(test_pump_stops_on_manual_stop_taking_priority);

    RUN_TEST(test_manual_allows_valid_request);
    RUN_TEST(test_manual_rejects_duration_above_max_61);
    RUN_TEST(test_manual_rejects_when_offline);
    RUN_TEST(test_manual_rejects_when_emergency_latched);
    RUN_TEST(test_manual_rejects_when_water_low);

    return UNITY_END();
}
