# Performance & Load Test (T-52)

Scope per `.agents/3-TASKS.md`: 100 devices, 200 msg/s ingest, p95 API
<500ms, WS fan-out, 90-day DB size, and backpressure behavior — and to note
the limits before migrating off SQLite to PostgreSQL. Tooling lives in
[`tools/loadtest/`](../tools/loadtest/README.md).

Two of the four tools below were run for real in this environment, against
a real `apps/api` server and a real on-disk SQLite file. The other two need
a live MQTT broker, which this sandbox doesn't have (no Docker daemon) —
same documented constraint as `tools/device-simulator`.

## 1. HTTP API latency (measured)

`pnpm --filter @smart-plant/loadtest loadtest:http -- --devices=100 --duration=20 --concurrency=20`

A real `apps/api` process, a freshly migrated SQLite file, 100 devices
owned by one user with ~2h of reading history each, and 20 concurrent
clients hammering `GET /devices`, `GET /devices/:id`, and
`GET /devices/:id/readings` for 20 seconds.

**First run surfaced a real bug**, not just a number: `GET /devices` did
one query for the device list, then — per device — three more queries
inside `toSummary()` (`findById`, `configs.getByDeviceId`,
`events.latestStatusEvent`). For a 100-device dashboard that's ~300 extra
round trips on a single SQLite connection for one HTTP request.

| Endpoint | Before (N+1) | After (batched) |
|---|---|---|
| `GET /devices` p50 | 638.8ms | 47.4ms |
| `GET /devices` p95 | **847.2ms** (over budget) | **65.4ms** |
| `GET /devices` p99 | 899.4ms | 92.3ms |
| Throughput (all 3 endpoints) | 32.0 req/s | 404.6 req/s |

Fix: `device.service.ts`'s `listForUser` now does exactly 3 queries total —
one for the devices, one batched `configs.getByDeviceIds()`, one batched
`events.latestStatusEventsByDeviceIds()` (a single correlated-subquery
statement reusing `idx_status_events_device_created`) — instead of 1 + 3N.
`toSummary()` (used by the single-device `GET /devices/:id`) is unchanged;
both now share a pure `buildSummary()` helper so the two code paths can't
drift apart. See [`device.service.ts`](../apps/api/src/services/device.service.ts),
[`configs.ts`](../packages/db/src/repositories/configs.ts),
[`events.ts`](../packages/db/src/repositories/events.ts).

**Result: all three endpoints are comfortably inside the p95 <500ms
budget at 100 devices** (p95 65.4ms / 64.7ms / 66.0ms), with over 10x
headroom. `GET /devices/:id/readings` also benefits from `HISTORY_MAX_POINTS`
downsampling (120 points max, regardless of raw row count).

Caveat: this measures the API/DB tier only, on one machine, with no MQTT
ingest load running concurrently (the harness points `MQTT_URL` at a closed
port so boot doesn't block — see `tools/loadtest/src/server-harness.ts`).
Re-run this alongside a live `loadtest:mqtt` run against a real broker
before trusting these numbers under the full combined load the spec
describes.

## 2. DB insert throughput & 90-day size projection (measured)

`pnpm --filter @smart-plant/loadtest loadtest:db`

Inserts 8,000 rows across 20 devices through `repos.readings.insertBatch`
— the exact code path the MQTT bridge uses (100-row / 100ms batches, see
`apps/api/src/plugins/mqtt.ts`) — into a real on-disk SQLite file, and
measures the file's actual growth (WAL-checkpointed before each
measurement).

```
batch_flush (insertBatch of 100 rows): p50=10.9ms p95=18.2ms p99=33.2ms max=33.2ms
measured sensor_readings growth: 194.6 bytes/row (file-level, incl. idx_readings_time)
```

The 100-row batch flush completes in **11–33ms**, well inside the 100ms
budget the batching design targets (`BATCH_FLUSH_MS` / `BATCH_MAX_SIZE` in
`mqtt.ts`) — there's roughly 3-9x headroom per flush on this machine alone.

Projected `sensor_readings` size at the 90-day raw-retention window
(`RAW_READINGS_RETENTION_DAYS`):

| Devices | Telemetry interval | Rows/device/day | Total rows (90d) | Projected size |
|---|---|---|---|---|
| 20 | 30s | 2,880 | 5,184,000 | 962 MiB |
| **100** | **30s** | 2,880 | 25,920,000 | **4.8 GiB** |
| 100 | 10s | 8,640 | 77,760,000 | 14.1 GiB |
| 500 | 30s | 2,880 | 129,600,000 | 23.5 GiB |

**This is the real limit to plan around before scaling past the pilot.**
At the default 100-device / 30s-interval target, raw telemetry alone grows
to ~4.8 GiB over the 90-day retention window — before `status_events`,
`watering_events`, indexes, or WAL/journal overhead. `readings_daily`
rollups (kept 2 years per `ROLLUP_RETENTION_DAYS`) are tiny by comparison
(one row per device per day). Recommendations:
- A single-writer SQLite file is fine for the V1 pilot scale this measures,
  but 500 devices or a sub-30s interval pushes raw storage well into
  "plan the PostgreSQL migration now" territory — not because insert
  throughput fails (it doesn't, see above), but because of file size,
  backup duration, and single-writer lock contention under concurrent
  reads.
- Consider shortening `RAW_READINGS_RETENTION_DAYS` below 90, or
  downsampling raw data into the hourly rollup sooner, if staying on
  SQLite past ~100 devices.

## 3. MQTT ingest rate (built, not run live)

`pnpm --filter @smart-plant/loadtest loadtest:mqtt -- --url=mqtt://localhost:1883 --devices=100 --rate=200 --duration=30`

Connects N virtual devices and publishes telemetry at a target aggregate
rate, reporting achieved msg/s and PUBACK latency. **Needs a real broker**
(`infra/docker-compose.yml` or `docker-compose.local-simple.yml`) — not
available in this sandbox (no Docker daemon). Run this against a real
broker, ideally concurrently with `loadtest:http`, before signing off on
the 200 msg/s target end to end.

## 4. WebSocket fan-out latency (built, not run live)

`pnpm --filter @smart-plant/loadtest loadtest:ws -- --mqttUrl=mqtt://localhost:1883 --devices=20 --duration=20`

Boots a real `apps/api` server wired to a real broker, publishes telemetry
as N owned devices, and measures publish → `eventBus` → `WsHub` →
`socket.send` latency end to end. Same broker constraint as above — not
run live here.

### Backpressure behavior (by design, from reading `ws-hub.ts`)

`WsHub.broadcast()` checks each socket's `bufferedAmount` before sending a
`reading` event; above `BACKPRESSURE_THRESHOLD_BYTES` (1,000,000 bytes) it
**drops that `reading` event for that slow client only** — `status`,
`watering`, and `notification` events are never dropped, since those carry
state transitions a client must not miss. This means a slow consumer loses
telemetry smoothness (the moisture/temperature readout goes stale) but
never silently misses an alert or a watering outcome. This wasn't
exercised under real backpressure in this sandbox (it needs enough
concurrent `reading` volume to fill a socket's buffer, i.e. the live MQTT
setup above); the design itself is sound and this is the behavior to
verify under `loadtest:mqtt` + `loadtest:ws` running together.

## Summary

| Budget (T-52) | Status |
|---|---|
| p95 API <500ms at 100 devices | **Met** (measured: 65.4ms, after fixing a real N+1) |
| 90-day DB size at pilot scale | **Measured**: ~4.8 GiB raw readings at 100 devices/30s — plan Postgres migration before 500 devices or <30s intervals |
| 100 devices / 200 msg/s ingest | Not verified live — no broker in this sandbox; tool ready (`loadtest:mqtt`) |
| WS fan-out latency | Not verified live — no broker in this sandbox; tool ready (`loadtest:ws`) |
| Backpressure behavior | Verified by code reading, not under live load — drops `reading` only, never `status`/`watering`/`notification` |
