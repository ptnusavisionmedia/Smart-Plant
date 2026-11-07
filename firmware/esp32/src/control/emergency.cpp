#include "emergency.h"
#include "../../include/config.h"
#include <Arduino.h>
#include <Preferences.h>

EmergencyLatch emergencyLatch;

namespace {
constexpr unsigned long kButtonDebounceMs = 50;
}

void EmergencyLatch::begin() {
    pinMode(PIN_EMERGENCY_BUTTON, INPUT_PULLUP);

    Preferences prefs;
    prefs.begin("emerg", /*readOnly=*/true);
    latched_ = prefs.getBool("latched", false);
    prefs.end();

    lastRawPressed_ = digitalRead(PIN_EMERGENCY_BUTTON) == LOW;
    lastChangeMs_ = millis();
}

void EmergencyLatch::tick() {
    bool rawPressed = digitalRead(PIN_EMERGENCY_BUTTON) == LOW;
    unsigned long now = millis();

    if (rawPressed != lastRawPressed_) {
        lastRawPressed_ = rawPressed;
        lastChangeMs_ = now;
    } else if (rawPressed && !latched_ && (now - lastChangeMs_) >= kButtonDebounceMs) {
        // Stable press while not already latched -> trip the latch.
        setLatched(true);
        buttonEdgePending_ = true;
    }
}

void EmergencyLatch::setLatched(bool latched) {
    latched_ = latched;
    Preferences prefs;
    prefs.begin("emerg", false);
    prefs.putBool("latched", latched_);
    prefs.end();
}

void EmergencyLatch::reset() {
    setLatched(false);
}

bool EmergencyLatch::consumeButtonEdge() {
    if (!buttonEdgePending_) return false;
    buttonEdgePending_ = false;
    return true;
}
