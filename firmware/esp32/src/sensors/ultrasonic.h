#pragma once

// HC-SR04 driver: 10us trigger, pulseIn with a 30ms timeout, median-of-5
// sampling, and a 3-consecutive-timeout fail-safe (Tech Spec §4.10).
namespace ultrasonic_sensor {

struct Result {
    float distanceCm;     // median valid distance, NAN if unreliable
    float levelPercent;   // derived tank level %, NAN if unreliable
    bool sensorError;     // true after 3 consecutive echo timeouts
};

void begin();

// Takes 5 raw samples (each its own 10us trigger + pulseIn), computes the
// median of the valid ones, and converts to a tank level percentage.
Result read(float tankHeightCm, float tankMaxLevelCm);

int consecutiveTimeouts();

} // namespace ultrasonic_sensor
