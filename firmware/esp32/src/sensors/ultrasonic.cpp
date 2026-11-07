#include "ultrasonic.h"
#include "ultrasonic_math.h"
#include "../../include/config.h"
#include <Arduino.h>

namespace ultrasonic_sensor {

static int g_consecutiveTimeouts = 0;

void begin() {
    pinMode(PIN_ULTRASONIC_TRIG, OUTPUT);
    pinMode(PIN_ULTRASONIC_ECHO, INPUT);
    digitalWrite(PIN_ULTRASONIC_TRIG, LOW);
}

static float triggerOnce() {
    digitalWrite(PIN_ULTRASONIC_TRIG, LOW);
    delayMicroseconds(2);
    digitalWrite(PIN_ULTRASONIC_TRIG, HIGH);
    delayMicroseconds(10); // 10us trigger pulse
    digitalWrite(PIN_ULTRASONIC_TRIG, LOW);

    unsigned long durationUs = pulseIn(PIN_ULTRASONIC_ECHO, HIGH, 30000UL); // 30ms timeout
    if (durationUs == 0) {
        return NAN; // timed out / no echo
    }
    return ultrasonic_math::pulseDurationToCm(durationUs);
}

Result read(float tankHeightCm, float tankMaxLevelCm) {
    float samples[5];
    bool anyValid = false;
    for (int i = 0; i < 5; i++) {
        samples[i] = triggerOnce();
        if (ultrasonic_math::isValidDistanceCm(samples[i])) anyValid = true;
        delay(10); // brief gap between pings to avoid cross-talk
    }

    if (!anyValid) {
        g_consecutiveTimeouts++;
    } else {
        g_consecutiveTimeouts = 0;
    }

    Result r{};
    r.sensorError = ultrasonic_math::shouldReportSensorError(g_consecutiveTimeouts);
    if (r.sensorError) {
        r.distanceCm = NAN;
        r.levelPercent = NAN;
        return r;
    }

    r.distanceCm = ultrasonic_math::medianOfValid(samples, 5);
    r.levelPercent = ultrasonic_math::distanceToLevelPercent(r.distanceCm, tankHeightCm, tankMaxLevelCm);
    return r;
}

int consecutiveTimeouts() { return g_consecutiveTimeouts; }

} // namespace ultrasonic_sensor
