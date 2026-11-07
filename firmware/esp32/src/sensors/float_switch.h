#pragma once

// Float switch driver: digital INPUT_PULLUP, active LOW = water below the
// float level, debounced 2s (Tech Spec §4.10). When present, this is
// authoritative over the ultrasonic reading for WATER_LOW decisions.
namespace float_switch {

void begin();

// Debounced read: only reports a state change once it has been stable for
// FLOAT_SWITCH_DEBOUNCE_MS.
bool isLow();

} // namespace float_switch
