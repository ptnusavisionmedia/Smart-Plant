#include "pump.h"
#include "../../include/config.h"
#include <Arduino.h>

Pump pump;

void Pump::begin() {
    pinMode(PIN_PUMP_RELAY, OUTPUT);
    digitalWrite(PIN_PUMP_RELAY, LOW); // never auto-activate on boot
    on_ = false;
}

void Pump::start(int durationSeconds, int maxPumpSeconds) {
    if (on_) return;
    if (durationSeconds < 1) durationSeconds = 1;
    if (durationSeconds > maxPumpSeconds) durationSeconds = maxPumpSeconds;

    requestedDurationSeconds_ = durationSeconds;
    startMs_ = millis();
    on_ = true;
    digitalWrite(PIN_PUMP_RELAY, HIGH);
}

void Pump::stop(PumpStopReason reason) {
    if (!on_) return;
    digitalWrite(PIN_PUMP_RELAY, LOW);
    on_ = false;
    lastStopReason_ = reason;
}

int Pump::elapsedSeconds() const {
    if (!on_) return 0;
    return static_cast<int>((millis() - startMs_) / 1000UL);
}

void Pump::tick() {
    if (!on_) return;
    if (elapsedSeconds() >= requestedDurationSeconds_ + WATCHDOG_GRACE_SECONDS) {
        // Watchdog: force off even if the control engine never called stop().
        digitalWrite(PIN_PUMP_RELAY, LOW);
        on_ = false;
        lastStopReason_ = PumpStopReason::MaxDurationReached;
    }
}
