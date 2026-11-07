# Load Test (T-52)

Four independent tools covering the budgets in `.agents/3-TASKS.md` T-52:
100 devices, 200 msg/s ingest, p95 API < 500ms, WS fan-out, 90-day DB size,
and backpressure behavior. Results and analysis are written up in
[`docs/performance.md`](../../docs/performance.md).

| Tool | What it measures | Needs a broker? |
|---|---|---|
| `loadtest:http` | p50/p95/p99 latency and throughput of the read endpoints (`GET /devices`, `GET /devices/:id`, `GET /devices/:id/readings`) against a real `apps/api` server and a seeded SQLite DB. | No |
| `loadtest:db` | Real on-disk SQLite growth per `sensor_readings` row (inserted through the same `insertBatch` path the MQTT bridge uses), projected to the 90-day raw-retention window for several device-count/interval scenarios. | No |
| `loadtest:mqtt` | MQTT ingest rate achieved vs. target, and broker PUBACK latency, publishing as N virtual devices. | **Yes** |
| `loadtest:ws` | End-to-end latency from an MQTT telemetry publish to delivery on the owning user's WebSocket connection. | **Yes** |

## Run

```bash
pnpm --filter @smart-plant/loadtest loadtest:http -- --devices=100 --duration=20 --concurrency=20
pnpm --filter @smart-plant/loadtest loadtest:db
```

`loadtest:http` and `loadtest:db` are fully self-contained: each boots its
own `apps/api` server (or just a migrated SQLite file) against a throwaway
temp directory and cleans up after itself. No external services required.

```bash
pnpm --filter @smart-plant/loadtest loadtest:mqtt -- --url=mqtt://localhost:1883 --devices=100 --rate=200 --duration=30
pnpm --filter @smart-plant/loadtest loadtest:ws -- --mqttUrl=mqtt://localhost:1883 --devices=20 --duration=20
```

`loadtest:mqtt` and `loadtest:ws` need a real, reachable MQTT broker — bring
up `infra/docker-compose.yml` or `infra/docker-compose.local-simple.yml`
first (see [`infra/README.md`](../../infra/README.md)), and for `loadtest:mqtt`
provision real device credentials with `tools/provision-device.ts` and pass
them via `--credentialsFile` (a JSON array of `{deviceUid, mqttSecret}`) if
the broker enforces auth.

## Known limitation

`loadtest:http` and `loadtest:db` were run for real in this environment —
their numbers in `docs/performance.md` are measured, not estimated.
`loadtest:mqtt` and `loadtest:ws` were built and typechecked here but not
run end to end, for the same reason as `tools/device-simulator`: no Docker
daemon was available in this sandbox, and no other MQTT broker could be
reached. Run them against a real broker (e.g. in staging) before relying on
their numbers.
