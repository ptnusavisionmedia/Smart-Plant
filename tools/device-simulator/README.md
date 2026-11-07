# Device Simulator (T-50)

Impersonates one ESP32 device over MQTT so the full ingest pipeline
(telemetry → status engine → SQLite → WebSocket → notifications) can be
exercised without real hardware or Wokwi.

## Setup

1. Provision a device row and get its `deviceUid` + `mqttSecret`:
   ```bash
   pnpm --filter @smart-plant/api exec tsx src/tools/provision-device.ts esp32-sim-01
   ```
2. Claim it from the web/mobile app (or via `POST /api/v1/devices/claim`) using the printed `claimCode`.
3. Make sure a broker is reachable (the real `infra/docker-compose*.yml` Mosquitto, or any local MQTT broker on `mqtt://localhost:1883`) and the API's `apps/api` server is running and connected to the same broker.

## Run

```bash
pnpm --filter @smart-plant/device-simulator sim -- \
  --deviceUid=esp32-sim-01 --secret=<mqttSecret> \
  --url=mqtt://localhost:1883 --scenario=normal --interval=5
```

### Scenarios

| Scenario | Behavior |
|---|---|
| `normal` | Soil/temp/humidity drift slowly within healthy ranges. |
| `dry` | Soil moisture drains fast — triggers `WARNING` then `CRITICAL` (SOIL_*_DRY), good for testing the status engine and notification cooldown. |
| `water-low` | Starts with a low tank level — triggers `WATER_LOW` and should block manual/auto watering. |
| `sensor-error` | Periodically sends `soilMoisture: null` — triggers `SENSOR_ERROR` instead of silently reporting `NORMAL`. |
| `offline-reconnect` | Disconnects for ~20s after a few ticks, buffers readings locally (`historical: true`), and replays them on reconnect — tests the offline buffer / LWT / presence flow. |

The simulator responds to `pump start/stop`, `emergency_stop`, `emergency_reset`,
and `config` commands exactly like the real firmware's MQTT handler (T-31),
acking each one and publishing a `state` message so the API's config
acceptance / emergency-latch sync logic can be tested end to end.

## Known limitation

This was built and typechecked in this environment, but a live
multi-broker integration run (simulator → real Mosquitto → API →
WebSocket) was not executed here because no Docker daemon was available
in the sandbox. Run it against `infra/docker-compose.local-simple.yml` or
`infra/docker-compose.yml` to verify live.
