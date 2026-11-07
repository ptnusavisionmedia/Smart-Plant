# Smart Plant Emergency Detector — ESP32 Firmware

Module 4 of the Smart Plant project (`.agents/3-TASKS.md` T-27..T-32). PlatformIO
+ Arduino framework firmware for the ESP32 that reads soil/temperature/
humidity/water-level sensors, runs a **local** (cloud-independent) auto-
watering control engine, enforces pump/emergency safety interlocks, and
talks to the backend over MQTT.

See `.agents/2-TECH-SPEC.md` (§1, §4.4, §4.6, §4.9, §4.10) for the full
business-rule spec this firmware implements, and `WOKWI.md` for the
hardware-free simulation demo.

## Layout

```
firmware/esp32/
├─ platformio.ini          # esp32dev / esp32dev-local / esp32dev-wokwi / native envs
├─ include/config.h         # pins, defaults, build-flag fallbacks
├─ src/
│  ├─ main.cpp              # setup()/loop() wiring
│  ├─ sensors/               # soil, DHT22, HC-SR04, float switch + pure math helpers
│  ├─ control/               # control engine (watering-policy.ts port), pump, emergency, config store, offline buffer
│  └─ network/               # WiFi, MQTT, provisioning, NTP time
├─ test/                     # Unity tests (native env, no hardware)
├─ wokwi.toml / diagram.json # Wokwi simulation project
└─ WOKWI.md                  # Wokwi demo guide (broker, part substitutions, how to run)
```

## MQTT contract

Topics and JSON payloads match `packages/shared/src/constants.ts` and
`packages/shared/src/schemas/{telemetry,command}.ts` **exactly** — this is
the canonical contract; the firmware has no way to import the TS types, so
keep both sides in sync by hand.

| Topic | Direction | Payload |
|---|---|---|
| `sp/{deviceId}/telemetry` | device -> broker, QoS 1 | `{deviceUid, ts, soilMoisture, temperature, humidity, waterLevel, waterLevelCm, waterLevelSource, pumpOn, firmwareVersion, historical}` |
| `sp/{deviceId}/presence` | device -> broker, LWT | plain string `"online"` / `"offline"` |
| `sp/{deviceId}/command` | broker -> device, QoS 1 | discriminated union: `pump` / `emergency_stop` / `emergency_reset` / `config` |
| `sp/{deviceId}/ack` | device -> broker, QoS 1 | `{id, ok, state, error?}` |
| `sp/{deviceId}/state` | device -> broker, QoS 1 (retained) | `{pumpOn, autoMode, emergencyLatched, configVersion, ts}` |

## Build & flash

```bash
cd firmware/esp32
pio run                        # builds the default env (esp32dev, production/TLS)
pio run -e esp32dev-local       # local dev build (plain MQTT against infra/docker-compose.yml)
pio run -e esp32dev -t upload   # flash real hardware
pio device monitor              # serial monitor — also where the pairing/claim code is printed on first boot
```

Override the broker host/port per build without editing `platformio.ini`:

```bash
pio run -e esp32dev -D MQTT_HOST='"mqtt.mydomain.com"' -D MQTT_PORT=8883
```

## Tests

```bash
pio test -e native       # Unity unit tests, no hardware/toolchain download needed
```

Covers:
- `test/test_ultrasonic` — HC-SR04 math: `<2cm`/`>400cm` rejection, median-of-5
  (with invalid samples discarded first), tank-level clamp to `[0,100]`,
  3-consecutive-timeout `SENSOR_ERROR`.
- `test/test_soil` — soil ADC-to-percent linear calibration, including the
  "sensor reads backwards" (dry > wet numerically) case, and clamping.
- `test/test_control_engine` — the local auto-watering decision engine,
  ported from `packages/shared/src/watering-policy.test.ts`'s own boundary
  cases: water safety at the 15/30 thresholds and float-switch authority,
  the 3-sample soil debounce around warningLow=40 (part of the 25/40/71/85
  threshold set), cooldown timing, `canStartAutoWatering` rejecting on every
  individual precondition (auto mode off, config not accepted, emergency
  latched, water low, soil not persistently low, cooldown active),
  `shouldStopPump`'s stop reasons (target/max-duration/water-low/emergency/
  manual, with manual-stop taking priority), and `validateManualWatering`.
- `test/test_offline_buffer` — the 100-reading ring buffer: FIFO replay
  order, `historical=true` tagging, and oldest-dropped-when-full.

`pio run` (the `esp32dev` env) additionally exercises the full hardware
build (WiFi/MQTT/DHT/Preferences/relay code) through the compiler, even
though it can't be flashed or run without a physical board.

## Known deviations from the spec / simplifications

- **TLS cert pinning**: `src/network/mqtt.cpp` currently calls
  `WiFiClientSecure::setInsecure()` under `MQTT_USE_TLS=1` rather than
  pinning the broker's CA certificate. Fine for development; **a real
  production deployment must replace this with `setCACert(...)`** (embed the
  Mosquitto/Caddy CA chain as a PROGMEM string) before going live, per Tech
  Spec §5 "MQTT: TLS 8883".
- **`isWaterSafe`'s float-switch branch**: the TS version in
  `watering-policy.ts` treats `floatSwitchLow` as optional (`undefined`
  means "no live float-switch state available, fall through"). The firmware
  always has a live float-switch reading when that source is configured, so
  `control_engine.cpp` simplifies this to a direct `source == FloatSwitch`
  branch. Documented in `control_engine.h`.
- **Manual watering "offline" check**: `validateManualWatering`'s
  `isOnline` is always `true` in firmware's own local call (the device is
  trivially "online" to itself); the real offline/online distinction for
  manual watering is enforced API-side per Tech Spec §4.5.
- **NVS config blob**: `config_store.cpp` persists the whole `DeviceConfig`
  as one serialized JSON blob (via ArduinoJson + `Preferences::putString`)
  rather than per-field NVS keys — simpler and atomic, at the cost of a
  slightly larger flash write per config change (configs change rarely).

## Manual bench checklist

Run through this on real hardware before shipping a unit. None of this can
be verified by `pio test -e native` or the Wokwi simulation alone.

### Soil moisture calibration
- [ ] Flash with the probe disconnected / in open air; call the dry
      calibration routine (expose a Serial command or button combo for this
      in a real build) and confirm the stored `dryAdc` matches a dry
      `analogRead()`.
- [ ] Submerge the probe in water (or saturated soil) and calibrate wet;
      confirm `wetAdc` is captured correctly.
- [ ] Confirm `soil_sensor::readPercent()` reports ~0% in dry air and ~100%
      in water/saturated soil after calibration, and that a reasonable
      pot-soil mix in between reads a sane midrange value.
- [ ] Power-cycle the board and confirm calibration survived (loaded from
      NVS, not reset to factory defaults).

### HC-SR04 in a real tank
- [ ] Mount the sensor above a real (or test) water tank/reservoir at the
      `tankHeightCm` distance from the bottom used in config.
- [ ] Confirm `distanceToLevelPercent` tracks a rising/falling real water
      level, not just the simulated math.
- [ ] Cover the sensor (or point it at an absorbent surface) to force echo
      timeouts for 3+ consecutive reads; confirm `waterLevel` goes to
      `null`/`SENSOR_ERROR` in the published telemetry and the pump is
      blocked (fail-safe) while that persists.
- [ ] Confirm readings recover (median valid again) once the obstruction is
      removed.

### Float switch
- [ ] With `waterLevelSource=float_switch` configured, manually lift/lower
      the float and confirm the 2-second debounce — a fast flicker should
      NOT immediately flip the reported state.
- [ ] Confirm the float switch state is authoritative: with the ultrasonic
      sensor also physically present and reporting "plenty of water", a
      float-switch-low reading still blocks the pump.

### Physical emergency button
- [ ] With the pump running (manual or auto), press the physical emergency
      button and confirm the pump stops **immediately** — verify both the
      hardware interlock (power is cut at the relay even if you pull the
      ESP32's USB/power, simulating a firmware hang) and the firmware's own
      software stop (published `ack`/`state` reflecting `emergencyLatched`).
- [ ] Confirm auto mode is forced off and the latch survives a power cycle
      (persisted in NVS) until explicitly reset.
- [ ] Send an `emergency_reset` command (`resumeAutoMode: true`) and confirm
      the latch clears and auto mode resumes; confirm `resumeAutoMode: false`
      clears the latch but leaves auto mode off.

### Watchdog
- [ ] Start a manual pump run; disable/freeze the control engine's stop
      condition path (e.g. via a debug build that skips `shouldStopPump`)
      and confirm `Pump::tick()`'s watchdog still force-cuts the relay at
      `requestedDurationSeconds + 5s` regardless.
- [ ] Confirm the pump never activates on boot/power-cycle under any stored
      state (auto mode, latch, or otherwise).

### Reconnect / offline buffering
- [ ] Disconnect the device's WiFi/router for several telemetry intervals;
      confirm readings accumulate in the offline buffer (check via Serial
      logging) instead of being dropped, up to the 100-reading cap.
- [ ] Reconnect and confirm the buffered readings are replayed in order,
      with their original timestamps and `historical: true`, before live
      telemetry resumes.
- [ ] Confirm the LWT (`sp/{deviceId}/presence` = `"offline"`) fired on the
      broker while disconnected, and `"online"` was republished on
      reconnect.
- [ ] Confirm local auto-watering kept running correctly (using the last
      NVS-stored config) while offline — this is the whole point of
      "firmware does not depend on the cloud for watering," Tech Spec §1.

### Default auto-off
- [ ] Flash a factory-fresh device (erase NVS first:
      `pio run -t erase && pio run -t upload`) and confirm `autoMode` reports
      `false` and `configVersion` is `0`/unaccepted until a real `config`
      command has been received and acked — the pump must never run
      automatically before that.
