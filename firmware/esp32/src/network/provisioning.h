#pragma once
#include <Arduino.h>

// ---------------------------------------------------------------------------
// Provisioning / pairing flow (Tech Spec §4.2 "Klaim Perangkat", T-31).
//
// The device has a stable factory deviceUid (derived from the ESP32's
// efuse MAC, so it never changes across reboots/reflashes) and a one-time
// pairing/claim code, both generated on first boot and persisted in NVS.
// The claim code is printed to Serial (matching the label-printed code a
// real product would ship with) so the user can type it into the web/mobile
// claim flow (`POST /devices/claim`, Tech Spec §3) — this firmware only
// implements the device side: it does not talk to the REST API directly.
//
// Until claimed, the device still connects to MQTT and publishes telemetry
// (so the backend can show "waiting for connection" per §4.2 step 6); it
// simply has no config/commands to act on yet, since config_store starts
// unaccepted (configVersion=0) regardless of claim state.
// ---------------------------------------------------------------------------
namespace provisioning {

void begin();

String deviceUid();
String claimCode();

// True once config_store has accepted a config (the backend only pushes a
// config after a successful claim), used as the claimed/unclaimed signal.
bool isClaimed();

} // namespace provisioning
