#pragma once
#include <algorithm>
#include <cmath>

// ---------------------------------------------------------------------------
// Pure HC-SR04 math (Tech Spec §4.10 "Kalibrasi & Pembacaan Sensor Air").
// No Arduino dependency — the hardware trigger/pulseIn loop lives in
// ultrasonic.cpp; this header is what the native unit tests exercise.
// ---------------------------------------------------------------------------
namespace ultrasonic_math {

// Reject obviously-invalid HC-SR04 readings: < 2 cm or > 400 cm, or a failed
// pulseIn (represented upstream as NAN).
inline bool isValidDistanceCm(float cm) {
    return !std::isnan(cm) && cm >= 2.0f && cm <= 400.0f;
}

// Converts microsecond pulse width (HC-SR04 ECHO high duration) to cm.
// speed of sound ~0.0343 cm/us, round trip -> divide by 2.
inline float pulseDurationToCm(unsigned long durationUs) {
    return static_cast<float>(durationUs) * 0.0343f / 2.0f;
}

// Median of up to 5 raw samples (Tech Spec §4.10 step 3): invalid samples
// (<2cm, >400cm, or failed/timed-out pulseIn passed in as NAN) are discarded
// first, then the median of the remaining valid samples is taken. Returns
// NAN if fewer than 3 of the 5 samples were valid (not enough signal to
// trust a median reading).
inline float medianOfValid(const float samples[], int count) {
    float valid[5];
    int n = 0;
    for (int i = 0; i < count && n < 5; i++) {
        if (isValidDistanceCm(samples[i])) valid[n++] = samples[i];
    }
    if (n < 3) return NAN;
    std::sort(valid, valid + n);
    return valid[n / 2];
}

// level% = clamp(((tankHeightCm - distanceCm) / tankMaxLevelCm) * 100, 0, 100)
// (Tech Spec §4.10 step 4).
inline float distanceToLevelPercent(float distanceCm, float tankHeightCm, float tankMaxLevelCm) {
    if (std::isnan(distanceCm) || tankMaxLevelCm <= 0.0f) return NAN;
    float pct = ((tankHeightCm - distanceCm) / tankMaxLevelCm) * 100.0f;
    if (pct < 0.0f) pct = 0.0f;
    if (pct > 100.0f) pct = 100.0f;
    return pct;
}

// Tech Spec §4.10 step 5: 3 consecutive echo timeouts -> waterLevel=null,
// SENSOR_ERROR, pump blocked (fail-safe, enforced by the control engine's
// isWaterSafe() treating a NAN waterLevel as unsafe).
inline bool shouldReportSensorError(int consecutiveEchoTimeouts) {
    return consecutiveEchoTimeouts >= 3;
}

} // namespace ultrasonic_math
