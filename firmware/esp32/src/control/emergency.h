#pragma once

// ---------------------------------------------------------------------------
// Emergency stop latch (Tech Spec §4.6, T-29).
//
// Hardware note: the physical emergency button is wired as a NORMALLY-CLOSED
// interlock in series with the pump relay's load supply, so pressing it cuts
// power to the pump motor directly at the hardware level — independent of
// firmware state, software bugs, or a hung MQTT/WiFi stack. The same button
// is ALSO wired to PIN_EMERGENCY_BUTTON (INPUT_PULLUP) so the firmware can
// observe the press, stop the pump via software too, disable auto mode, and
// persist the latch to NVS so it survives a reboot.
// ---------------------------------------------------------------------------
class EmergencyLatch {
public:
    void begin();

    // Call every loop() iteration: polls the button (debounced) and, on a
    // new press, sets+persists the latch.
    void tick();

    bool isLatched() const { return latched_; }

    // Software-driven latch (physical button press, or the `emergency_stop`
    // MQTT command). Always persisted to NVS.
    void setLatched(bool latched);

    // `emergency_reset` command: clears the latch. resumeAutoMode is applied
    // by the caller (control engine / config_store), this only clears the
    // latch bit itself.
    void reset();

    // Returns true exactly once per new physical button press (edge
    // detected), so the caller can publish a state update / ack.
    bool consumeButtonEdge();

private:
    bool latched_ = false;
    bool lastRawPressed_ = false;
    unsigned long lastChangeMs_ = 0;
    bool buttonEdgePending_ = false;
};

extern EmergencyLatch emergencyLatch;
