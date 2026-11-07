# Smart Plant Emergency Detector

An IoT plant-monitoring and auto-watering system. An ESP32 device reads soil
moisture, temperature, humidity, and water-tank level, computes a
NORMAL/WARNING/CRITICAL/WATER_LOW status locally, and waters automatically
within safe limits (target moisture, max pump duration, cooldown, emergency
stop) — all without needing the cloud. A Fastify API bridges the device
over MQTT to a Next.js web dashboard, a Flutter mobile app, and Telegram,
for real-time monitoring, history, and remote control.

Full product/architecture docs: [`.agents/1-PRD.md`](.agents/1-PRD.md),
[`.agents/2-TECH-SPEC.md`](.agents/2-TECH-SPEC.md),
[`.agents/DESIGN.md`](.agents/DESIGN.md),
[`.agents/3-TASKS.md`](.agents/3-TASKS.md).

## Repository layout

| Path | What's there |
|---|---|
| [`apps/api`](apps/api) | Fastify 5 API — auth, devices, MQTT bridge, WebSocket fan-out, jobs, Telegram bot |
| [`apps/web`](apps/web) | Next.js 14 dashboard (monitoring, history, config, notifications) |
| [`apps/mobile`](apps/mobile) | Flutter app (Android/iOS) |
| [`firmware/esp32`](firmware/esp32) | PlatformIO/Arduino firmware — sensors, control engine, MQTT, offline buffer; see [`WOKWI.md`](firmware/esp32/WOKWI.md) for the Wokwi simulation |
| [`packages/shared`](packages/shared) | Zod schemas, status engine, watering policy, constants — shared by API/web/tools |
| [`packages/db`](packages/db) | Drizzle ORM schema, migrations, repositories, SQLite backup helper |
| [`tools/device-simulator`](tools/device-simulator) | MQTT client that impersonates a real device, for testing without hardware |
| [`tools/loadtest`](tools/loadtest) | Load-test tools (HTTP latency, DB size projection, MQTT ingest, WS fan-out) — see [`docs/performance.md`](docs/performance.md) |
| [`infra`](infra) | Local/production Docker Compose, Mosquitto config, Caddy, backup/restore scripts |
| [`docs`](docs) | Operational docs: performance, runbook, provisioning, release checklist |

## Prerequisites

- Node.js ≥ 22, [pnpm](https://pnpm.io) (`corepack enable` is enough)
- Docker + Docker Compose, for the MQTT broker (and production deploy)
- PlatformIO (VS Code extension or CLI), for firmware builds — a Wokwi account/extension if simulating without hardware
- Flutter SDK, for the mobile app

## Quickstart (API + web, local dev)

```bash
pnpm install
cp .env.example .env   # fill in real secrets — see the file's comments
pnpm db:migrate
```

Bring up the MQTT broker (pick one — see [`infra/README.md`](infra/README.md) for the difference):

```bash
docker compose -f infra/docker-compose.local-simple.yml up -d
```

Then run everything else:

```bash
pnpm dev   # turbo run dev --parallel: api (3001) + web (3000)
```

Provision a test device and claim it from the web app:

```bash
pnpm --filter @smart-plant/api exec tsx src/tools/provision-device.ts esp32-test-01
```

Simulate that device over MQTT instead of flashing real hardware — see
[`tools/device-simulator/README.md`](tools/device-simulator/README.md). To
run the real firmware in Wokwi instead, see
[`firmware/esp32/WOKWI.md`](firmware/esp32/WOKWI.md).

## Common scripts (root)

| Command | Does |
|---|---|
| `pnpm dev` | Run all apps in dev mode (Turborepo) |
| `pnpm build` / `pnpm typecheck` / `pnpm lint` / `pnpm test` | Run that task across every workspace package |
| `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:generate` | Drizzle migrations, system-profile seed, migration generation |
| `pnpm format` | Prettier, repo-wide |
| `pnpm --filter @smart-plant/web run e2e` | Playwright golden-path test (register → login → claim device) against a real, throwaway `apps/api` + `next dev` — see `apps/web/playwright.config.ts` |

## Operations

- [`docs/runbook.md`](docs/runbook.md) — restart, migration, restore, secret rotation
- [`docs/provisioning.md`](docs/provisioning.md) — provisioning and claiming a real device
- [`docs/performance.md`](docs/performance.md) — load test methodology and measured results
- [`docs/release-checklist.md`](docs/release-checklist.md) — web/mobile release checklist and store metadata
- [`infra/README.md`](infra/README.md) — local/production infra, TLS, backup/restore
