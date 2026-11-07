#pragma once
#include "control_engine.h"

// ---------------------------------------------------------------------------
// Relay control with a hard maxPumpSeconds cap and a watchdog force-off at
// max+5s (Tech Spec §4.4/§4.9, T-29). The pump NEVER auto-activates on boot
// — begin() always leaves the relay de-energized.
// ---------------------------------------------------------------------------
class Pump {
public:
    void begin();

    // Starts the pump for durationSeconds (clamped to [1, maxPumpSeconds]).
    // No-op if already on.
    void start(int durationSeconds, int maxPumpSeconds);

    void stop(PumpStopReason reason);

    // Call every loop() iteration: enforces the watchdog force-off at
    // requested-duration + WATCHDOG_GRACE_SECONDS, regardless of what the
    // control engine decides (belt-and-suspenders against a stuck relay or
    // a control-engine bug).
    void tick();

    bool isOn() const { return on_; }
    int elapsedSeconds() const;
    int requestedDurationSeconds() const { return requestedDurationSeconds_; }
    PumpStopReason lastStopReason() const { return lastStopReason_; }

private:
    bool on_ = false;
    unsigned long startMs_ = 0;
    int requestedDurationSeconds_ = 0;
    PumpStopReason lastStopReason_ = PumpStopReason::None;
};

extern Pump pump;
