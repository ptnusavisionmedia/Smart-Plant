// Unity tests for the pure soil-moisture calibration math (Tech Spec §4.10).
#include <unity.h>
#include "sensors/soil_calibration.h"

void setUp() {}
void tearDown() {}

void test_dry_adc_maps_to_0_percent() {
    float pct = soil_calibration::rawToPercent(/*raw=*/3000, /*dry=*/3000, /*wet=*/500);
    TEST_ASSERT_FLOAT_WITHIN(0.01f, 0.0f, pct);
}

void test_wet_adc_maps_to_100_percent() {
    float pct = soil_calibration::rawToPercent(/*raw=*/500, /*dry=*/3000, /*wet=*/500);
    TEST_ASSERT_FLOAT_WITHIN(0.01f, 100.0f, pct);
}

void test_midpoint_maps_to_50_percent() {
    float pct = soil_calibration::rawToPercent(/*raw=*/1750, /*dry=*/3000, /*wet=*/500);
    TEST_ASSERT_FLOAT_WITHIN(0.1f, 50.0f, pct);
}

void test_clamps_above_100_when_raw_beyond_wet() {
    // raw more "wet" than the wet calibration point -> clamp to 100
    float pct = soil_calibration::rawToPercent(/*raw=*/400, /*dry=*/3000, /*wet=*/500);
    TEST_ASSERT_FLOAT_WITHIN(0.01f, 100.0f, pct);
}

void test_clamps_below_0_when_raw_beyond_dry() {
    float pct = soil_calibration::rawToPercent(/*raw=*/3200, /*dry=*/3000, /*wet=*/500);
    TEST_ASSERT_FLOAT_WITHIN(0.01f, 0.0f, pct);
}

void test_handles_inverted_calibration_wet_greater_than_dry() {
    // Some boards read LOW when dry and HIGH when wet — the mapping must
    // still work regardless of which calibration value is numerically larger.
    float dryLow = soil_calibration::rawToPercent(/*raw=*/200, /*dry=*/200, /*wet=*/3500);
    float wetHigh = soil_calibration::rawToPercent(/*raw=*/3500, /*dry=*/200, /*wet=*/3500);
    TEST_ASSERT_FLOAT_WITHIN(0.01f, 0.0f, dryLow);
    TEST_ASSERT_FLOAT_WITHIN(0.01f, 100.0f, wetHigh);
}

void test_degenerate_calibration_returns_nan() {
    float pct = soil_calibration::rawToPercent(1000, 1500, 1500);
    TEST_ASSERT_TRUE(std::isnan(pct));
}

int main(int argc, char** argv) {
    UNITY_BEGIN();
    RUN_TEST(test_dry_adc_maps_to_0_percent);
    RUN_TEST(test_wet_adc_maps_to_100_percent);
    RUN_TEST(test_midpoint_maps_to_50_percent);
    RUN_TEST(test_clamps_above_100_when_raw_beyond_wet);
    RUN_TEST(test_clamps_below_0_when_raw_beyond_dry);
    RUN_TEST(test_handles_inverted_calibration_wet_greater_than_dry);
    RUN_TEST(test_degenerate_calibration_returns_nan);
    return UNITY_END();
}
