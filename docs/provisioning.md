# Device Provisioning (T-55)

How a device row gets created, how a device authenticates to the broker,
and how a user claims it from the app. This is the flow actually verified
in this repository (CLI → DB → HTTP claim → MQTT auth/ACL), not a
description of an unimplemented design.

## 1. Provision a device row

```bash
pnpm --filter @smart-plant/api exec tsx src/tools/provision-device.ts <deviceUid>
```

`<deviceUid>` is any string you choose to identify the physical device
(e.g. `esp32-greenhouse-01`). This creates an unclaimed row and prints:

```json
{ "deviceId": "...", "deviceUid": "esp32-greenhouse-01", "claimCode": "SP-XXXX-XXXX", "mqttSecret": "<64-hex-char secret>" }
```

- `claimCode` is single-use-per-device (cleared on claim) and valid for 1
  year from provisioning (`claimCodeExpiresAt`, see `device.service.ts`).
- `mqttSecret` is the device's MQTT password. Only its SHA-256 hash is
  stored (`mqttSecretHash`) — the plaintext is shown exactly once, here.
  Record it somewhere safe (a password manager, not a chat log or a
  committed file) before closing the terminal.

## 2. Get the secret onto the device

- **`tools/device-simulator`**: pass `--secret=<mqttSecret>` directly on
  the command line — see its [README](../tools/device-simulator/README.md).
- **Real ESP32 hardware against the production/local-dev broker
  (`infra/docker-compose.yml`, mosquitto-go-auth)**: **not currently wired
  up** — see "Known gap" below before relying on this path.
- **Wokwi demo**: doesn't need a secret at all — see §4 below.

## 3. Claim the device

From the web/mobile app's "Klaim Perangkat" flow, or directly:

```bash
curl -X POST http://localhost:3001/api/v1/devices/claim \
  -H "authorization: Bearer <accessToken>" -H "content-type: application/json" \
  -d '{"claimCode":"SP-XXXX-XXXX","name":"Greenhouse 1","location":"Backyard"}'
```

This is rate-limited to **5 claims per user per hour** (`rateLimiters.claim`
in `plugins/rate-limit.ts`) — an abuse control on the claim-code endpoint,
not a bug. Seeding many devices for testing should go through the
repositories directly (see `tools/loadtest/src/seed.ts` for the pattern),
not loop the real claim endpoint.

Claiming assigns the device to the user, creates its `device_configs` row
with the defaults in `DEFAULT_DEVICE_CONFIG` (`packages/shared/src/constants.ts`),
and clears the claim code so it can't be reused.

## 4. Running it live — three ways

| Path | Needs real hardware? | Needs a broker? | MQTT auth |
|---|---|---|---|
| `tools/device-simulator` | No | Yes — any reachable broker | Sends the provisioned `mqttSecret` as the MQTT password, exactly like real firmware should |
| Wokwi simulation (`firmware/esp32`, see [`WOKWI.md`](../firmware/esp32/WOKWI.md)) | No (ESP32 is simulated) | Yes — a **public** test broker (`broker.hivemq.com`), since Wokwi can't reach `localhost` | None — public test broker, no auth, no `deviceUid` pre-registration needed |
| Real ESP32 hardware | Yes | Yes — `infra/docker-compose.yml` (production-faithful) or `docker-compose.local-simple.yml` | **Gap — see below** |

The Wokwi path is genuinely end-to-end runnable today: build the
`esp32dev-wokwi` PlatformIO environment, run it in the Wokwi simulator, and
point a locally running `apps/api` at the same public broker to watch
telemetry flow all the way to the dashboard — `WOKWI.md` §4 has the exact
steps. It intentionally doesn't exercise the secure broker/auth path, since
a public test broker has none.

### Known gap: real hardware vs. the secure broker

`firmware/esp32/src/network/mqtt.cpp`'s `connect()` call passes
`pass=nullptr` — **the firmware never sends an MQTT password**. Against
`infra/docker-compose.yml`'s mosquitto-go-auth backend, `/internal/mqtt/auth`
(`apps/api/src/routes/internal-mqtt.ts`) requires a password matching the
device's provisioned `mqttSecret`, so a real device as currently flashed
cannot authenticate there — only the Wokwi path (public, unauthenticated
broker) and `docker-compose.local-simple.yml` (if configured with
`allow_anonymous true`) currently work.

This wasn't discovered by the firmware module's own verification (61/61
native unit tests + 3 clean PlatformIO builds — none of which exercise a
live broker) nor noticed until this doc was written while tracing the
provisioning flow end to end.

Also note: `provisioning.cpp` has the device generate and `Serial.println`
its *own* random claim code — that code is never sent to the API, so it
will never match a server-side record. **Use the `claimCode` printed by
`provision-device.ts` in the app, not the one printed on the device's
serial console**, until this is reconciled.

Minimal fix for a future session, in order:
1. Add an `MQTT_SECRET` build flag (same pattern as `DEVICE_UID_PREFIX` in
   `platformio.ini`/`config.h`) and pass it as `mqtt.cpp`'s `connect()`
   `pass` argument, set per-device at flash time from `provision-device.ts`'s
   output.
2. Either stop the firmware from generating its own claim code (drop that
   half of `provisioning.cpp`), or add a backend endpoint for a device to
   self-register with its own generated `deviceUid`/claim code on first
   contact, and reconcile which claim code the operator is supposed to use.
Not attempted in this session — it touches firmware C++ with no hardware
or Wokwi runtime available here to verify the change, and risks regressing
a module whose own test suite already passed.

## 5. Config acceptance

After claiming, the API's MQTT bridge pushes the device's config via the
`command` topic; the device's own ack (`state` message with the matching
`configVersion`) marks it "accepted" (`configs.markAccepted`). Auto mode
stays off (`DEFAULT_AUTO_MODE = false`) until that first acceptance — see
Tech Spec §4.4 step 8.
