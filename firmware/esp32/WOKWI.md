# Wokwi Simulation — Smart Plant Emergency Detector

This folder is a working [Wokwi](https://wokwi.com) project so the whole
ESP32 <-> MQTT <-> (eventually) backend flow can be demoed **without any real
hardware**. It is driven by `wokwi.toml` + `diagram.json` and is compatible
with both the Wokwi VS Code extension and wokwi.com's "Import from GitHub"
flow.

## 1. Build the Wokwi firmware

Wokwi simulates the ESP32 chip, not a production network. Build the
dedicated `esp32dev-wokwi` PlatformIO environment (see "Which broker" below
for why it's a separate environment from `esp32dev`):

```bash
cd firmware/esp32
pio run -e esp32dev-wokwi
```

This produces `.pio/build/esp32dev-wokwi/firmware.bin` / `firmware.elf`,
which `wokwi.toml` points at.

## 2. Run the simulation

**Option A — VS Code (recommended):**
1. Install the "Wokwi Simulator" VS Code extension (requires a free Wokwi
   account / license token, see the extension's setup instructions).
2. Open the `firmware/esp32` folder in VS Code.
3. Press `F1` -> "Wokwi: Start Simulator" (or the keyboard shortcut the
   extension assigns). It reads `wokwi.toml` + `diagram.json` automatically.

**Option B — wokwi.com:**
1. Push this repo (or just the `firmware/esp32` folder) to GitHub.
2. On wokwi.com, use "Import project from GitHub" and point it at
   `firmware/esp32`. Wokwi reads the same `wokwi.toml` / `diagram.json`.
3. You still need to build the `.bin`/`.elf` locally first (step 1) and
   commit them, or wire up Wokwi's CI build action — wokwi.com does not run
   PlatformIO for you.

The ESP32 part in Wokwi has **real internet access** (Wokwi's cloud proxies
the simulated WiFi's traffic out to the real internet), so WiFi + MQTT both
work against a real public broker — see below.

## 3. Simulated parts <-> real hardware mapping

| diagram.json part | Pin(s) | Real hardware | Notes |
|---|---|---|---|
| `wokwi-esp32-devkit-c-v4` (`esp32`) | — | ESP32 DevKit-C | Same board target as `esp32dev` in platformio.ini |
| `wokwi-dht22` (`dht22`) | D4 | DHT22 temp/humidity sensor | Direct 1:1 simulation, no substitution needed |
| `wokwi-hc-sr04` (`ultrasonic`) | D5 (TRIG), D18 (ECHO) | HC-SR04 ultrasonic distance sensor | Direct 1:1 simulation |
| `wokwi-potentiometer` (`pot-soil`) | D34 (ADC) | **Capacitive soil moisture sensor** | **Substitution** — see below |
| `wokwi-pushbutton` (`btn-float-switch`) | D19, active LOW | Float switch | A press simulates "water below the float level" |
| `wokwi-pushbutton` (`btn-emergency-stop`) | D21, active LOW | Physical emergency-stop button | A press simulates the hardware interlock tripping |
| `wokwi-led` (`led-pump`) + resistor | D23 | Pump relay module | LED on = relay energized = pump running |

### The soil moisture substitution

**Wokwi's part library has no capacitive (or resistive) soil moisture
sensor.** A potentiometer wired to an ADC pin (D34) stands in for it: turning
the knob in the simulator UI changes the raw ADC value exactly the way a
drier/wetter probe would on real hardware. The firmware's calibration logic
(`src/sensors/soil_calibration.h`, `soil_sensor::calibrateDry()` /
`calibrateWet()`) does not know or care that the ADC source is a pot instead
of a probe — the raw-ADC-to-percent math is identical either way. To exercise
the "dry" and "wet" calibration readings in the simulator, turn the
potentiometer fully one way, call the dry calibration step, turn it fully the
other way, call the wet calibration step.

## 4. Which MQTT broker the demo uses, and why

Wokwi's simulated WiFi has real internet egress, **but it cannot reach
`localhost:1883`** — there is no "localhost" from the simulator's point of
view, so this repo's local `infra/docker-compose.yml` Mosquitto is
unreachable from Wokwi.

So the `esp32dev-wokwi` PlatformIO environment (see `platformio.ini`) builds
with:

```
MQTT_HOST = "broker.hivemq.com"
MQTT_PORT = 1883
MQTT_USE_TLS = 0
DEVICE_UID_PREFIX = "sp-demo-wokwi-"
```

`broker.hivemq.com` is HiveMQ's public test broker, over plain (non-TLS)
TCP. **This is a public demo broker only — never use it for production or
real hardware.** Anyone in the world can subscribe to `sp/#` on that broker
and see this demo device's topic traffic (there is no auth/ACL on a public
test broker). That's why `DEVICE_UID_PREFIX` is changed to
`sp-demo-wokwi-` — the firmware appends a 6-hex-digit suffix derived from the
(simulated) chip's efuse MAC, so each simulation run still gets a
reasonably unique topic namespace (e.g. `sp/sp-demo-wokwi-a1b2c3/telemetry`),
but treat anything published there as public.

(`test.mosquitto.org` is the other common public test broker and works
identically — swap `MQTT_HOST` if HiveMQ's is down.)

### Watching the demo's telemetry

With the simulation running and connected, from any machine with
`mosquitto_sub` installed (no auth needed on the public broker):

```bash
mosquitto_sub -h broker.hivemq.com -p 1883 -t 'sp/sp-demo-wokwi-+/#' -v
```

This prints every `telemetry` / `presence` / `state` / `ack` message the
simulated device publishes. You can also point this project's own API at the
same broker (temporarily set its MQTT connection config to
`broker.hivemq.com:1883`, no TLS) to see the full pipeline — telemetry ->
status evaluation -> WebSocket -> dashboard — working end-to-end against the
simulator, without touching the real `infra/mosquitto` stack.

## 5. Switching back to the real broker

Real hardware (or a non-Wokwi local build) should **never** use the
`esp32dev-wokwi` environment. Use:

- `pio run -e esp32dev-local -t upload` — local dev against
  `infra/docker-compose.yml`'s Mosquitto (plain TCP 1883, override
  `MQTT_HOST` in `platformio.ini` to your machine's LAN IP or hostname).
- `pio run -e esp32dev -t upload` — production, TLS MQTT 8883 against the
  real deployed broker (override `MQTT_HOST` to your actual domain).

All three environments share the same `src/` — only the `-D MQTT_HOST` /
`MQTT_PORT` / `MQTT_USE_TLS` / `DEVICE_UID_PREFIX` build flags differ (see
`platformio.ini`). Nothing in application code needs to change to switch
brokers.
