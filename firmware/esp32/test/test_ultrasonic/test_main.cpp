// Unity tests for the pure HC-SR04 math helpers (Tech Spec §4.10).
// Runs on the `native` PlatformIO env — no hardware required.
#include <unity.h>
#include "sensors/ultrasonic_math.h"

void setUp() {}
void tearDown() {}

// ---- isValidDistanceCm -----------------------------------------------------

void test_rejects_below_2cm() {
    TEST_ASSERT_FALSE(ultrasonic_math::isValidDistanceCm(1.9f));
}

void test_accepts_exactly_2cm() {
    TEST_ASSERT_TRUE(ultrasonic_math::isValidDistanceCm(2.0f));
}

void test_accepts_exactly_400cm() {
    TEST_ASSERT_TRUE(ultrasonic_math::isValidDistanceCm(400.0f));
}

void test_rejects_above_400cm() {
    TEST_ASSERT_FALSE(ultrasonic_math::isValidDistanceCm(400.1f));
}

void test_rejects_nan() {
    TEST_ASSERT_FALSE(ultrasonic_math::isValidDistanceCm(NAN));
}

// ---- medianOfValid ----------------------------------------------------

void test_median_of_5_valid_samples() {
    float samples[5] = {10.0f, 12.0f, 11.0f, 50.0f, 11.5f};
    float m = ultrasonic_math::medianOfValid(samples, 5);
    TEST_ASSERT_FLOAT_WITHIN(0.01f, 11.5f, m);
}

void test_median_discards_out_of_range_samples_first() {
    // 1.0 (<2cm) and 500.0 (>400cm) are discarded before taking the median.
    float samples[5] = {1.0f, 20.0f, 21.0f, 22.0f, 500.0f};
    float m = ultrasonic_math::medianOfValid(samples, 5);
    TEST_ASSERT_FLOAT_WITHIN(0.01f, 21.0f, m);
}

void test_median_returns_nan_when_fewer_than_3_valid() {
    float samples[5] = {1.0f, 1.0f, 500.0f, 20.0f, 500.0f}; // only one valid (20.0)
    float m = ultrasonic_math::medianOfValid(samples, 5);
    TEST_ASSERT_TRUE(std::isnan(m));
}

void test_median_of_exactly_3_valid() {
    float samples[3] = {5.0f, 7.0f, 6.0f};
    float m = ultrasonic_math::medianOfValid(samples, 3);
    TEST_ASSERT_FLOAT_WITHIN(0.01f, 6.0f, m);
}

// ---- distanceToLevelPercent (clamp) ------------------------------------

void test_level_percent_midrange() {
    // tankHeight=30, tankMaxLevel=25, distance=10 -> (30-10)/25*100 = 80%
    float pct = ultrasonic_math::distanceToLevelPercent(10.0f, 30.0f, 25.0f);
    TEST_ASSERT_FLOAT_WITHIN(0.01f, 80.0f, pct);
}

void test_level_percent_clamps_to_100_when_tank_overfull() {
    // distance=0 -> (30-0)/25*100 = 120% -> clamped to 100
    float pct = ultrasonic_math::distanceToLevelPercent(0.0f, 30.0f, 25.0f);
    TEST_ASSERT_FLOAT_WITHIN(0.01f, 100.0f, pct);
}

void test_level_percent_clamps_to_0_when_tank_empty() {
    // distance=30 (== tankHeight) -> (30-30)/25*100 = 0%
    float pct = ultrasonic_math::distanceToLevelPercent(30.0f, 30.0f, 25.0f);
    TEST_ASSERT_FLOAT_WITHIN(0.01f, 0.0f, pct);
}

void test_level_percent_clamps_negative_when_distance_exceeds_tank_height() {
    // distance=35 (> tankHeight) -> negative raw -> clamped to 0
    float pct = ultrasonic_math::distanceToLevelPercent(35.0f, 30.0f, 25.0f);
    TEST_ASSERT_FLOAT_WITHIN(0.01f, 0.0f, pct);
}

void test_level_percent_nan_distance_propagates() {
    float pct = ultrasonic_math::distanceToLevelPercent(NAN, 30.0f, 25.0f);
    TEST_ASSERT_TRUE(std::isnan(pct));
}

// ---- shouldReportSensorError (3 consecutive timeouts) ------------------

void test_sensor_error_false_below_3_timeouts() {
    TEST_ASSERT_FALSE(ultrasonic_math::shouldReportSensorError(0));
    TEST_ASSERT_FALSE(ultrasonic_math::shouldReportSensorError(1));
    TEST_ASSERT_FALSE(ultrasonic_math::shouldReportSensorError(2));
}

void test_sensor_error_true_at_3_timeouts() {
    TEST_ASSERT_TRUE(ultrasonic_math::shouldReportSensorError(3));
    TEST_ASSERT_TRUE(ultrasonic_math::shouldReportSensorError(4));
}

// ---- pulseDurationToCm --------------------------------------------------

void test_pulse_duration_to_cm() {
    // 1000us round trip -> 1000 * 0.0343 / 2 = 17.15 cm
    float cm = ultrasonic_math::pulseDurationToCm(1000UL);
    TEST_ASSERT_FLOAT_WITHIN(0.01f, 17.15f, cm);
}

int main(int argc, char** argv) {
    UNITY_BEGIN();
    RUN_TEST(test_rejects_below_2cm);
    RUN_TEST(test_accepts_exactly_2cm);
    RUN_TEST(test_accepts_exactly_400cm);
    RUN_TEST(test_rejects_above_400cm);
    RUN_TEST(test_rejects_nan);
    RUN_TEST(test_median_of_5_valid_samples);
    RUN_TEST(test_median_discards_out_of_range_samples_first);
    RUN_TEST(test_median_returns_nan_when_fewer_than_3_valid);
    RUN_TEST(test_median_of_exactly_3_valid);
    RUN_TEST(test_level_percent_midrange);
    RUN_TEST(test_level_percent_clamps_to_100_when_tank_overfull);
    RUN_TEST(test_level_percent_clamps_to_0_when_tank_empty);
    RUN_TEST(test_level_percent_clamps_negative_when_distance_exceeds_tank_height);
    RUN_TEST(test_level_percent_nan_distance_propagates);
    RUN_TEST(test_sensor_error_false_below_3_timeouts);
    RUN_TEST(test_sensor_error_true_at_3_timeouts);
    RUN_TEST(test_pulse_duration_to_cm);
    return UNITY_END();
}
