#include "float_switch.h"
#include "../../include/config.h"
#include <Arduino.h>

namespace float_switch {

static bool g_stableLow = false;     // debounced, reported state
static bool g_lastRawLow = false;    // last raw pin reading
static unsigned long g_lastChangeMs = 0;

void begin() {
    pinMode(PIN_FLOAT_SWITCH, INPUT_PULLUP);
    g_lastRawLow = digitalRead(PIN_FLOAT_SWITCH) == LOW;
    g_stableLow = g_lastRawLow;
    g_lastChangeMs = millis();
}

bool isLow() {
    bool rawLow = digitalRead(PIN_FLOAT_SWITCH) == LOW;
    unsigned long now = millis();

    if (rawLow != g_lastRawLow) {
        g_lastRawLow = rawLow;
        g_lastChangeMs = now;
    }

    if ((now - g_lastChangeMs) >= FLOAT_SWITCH_DEBOUNCE_MS) {
        g_stableLow = g_lastRawLow;
    }

    return g_stableLow;
}

} // namespace float_switch
