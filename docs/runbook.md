# Operational Runbook (T-55)

Production stack is `infra/docker-compose.prod.yml` (Caddy + `api` + Mosquitto). All commands below run from the repo root unless noted; `docker compose` always needs `-f infra/docker-compose.prod.yml`.

## Restart

```bash
docker compose -f infra/docker-compose.prod.yml restart api
```

`apps/api/src/server.ts` handles `SIGTERM`/`SIGINT` gracefully (`app.close()` drains in-flight requests, closes the WS hub and the SQLite handle) before exiting, so this is safe under load. For Mosquitto alone (e.g. after a TLS cert renewal), use `infra/scripts/reload-mqtt-tls.sh` instead — it only restarts `mosquitto`, not `api`, so devices don't lose their claimed sessions.

To restart everything (rare — e.g. after an `.env` change that every service reads):

```bash
docker compose -f infra/docker-compose.prod.yml restart
```

## Deploying new API code

```bash
docker compose -f infra/docker-compose.prod.yml build api
infra/scripts/backup.sh pre-deploy   # always back up before a deploy that migrates the schema
docker compose -f infra/docker-compose.prod.yml up -d api
```

If the new code includes a Drizzle migration, run it against the live `api_data` volume **before** traffic hits the new schema-dependent code — either as a one-off exec right after `up -d`, or (safer) stop the old container, migrate, then start the new one:

```bash
docker compose -f infra/docker-compose.prod.yml exec api \
  node node_modules/tsx/dist/cli.mjs ../../packages/db/src/migrate.ts
```

This runs inside the `api` container at its `WORKDIR` (`/app/apps/api`); the relative path reaches `packages/db`'s migrator, and `DATABASE_FILE` is already set to `/data/smartplant.db` by the compose service's environment (inherited by `exec`, same as any other env var set at container start). Verify after:

```bash
curl -f https://your-domain/ready   # 200 once api is up and reconnected to mosquitto; 503 with a reason otherwise
```

If the migration or new code breaks something, see **Restore** below — `backup.sh pre-deploy` just took the safety net you need.

## Migration (schema change, no deploy)

Same command as above, run any time:

```bash
infra/scripts/backup.sh pre-migration
docker compose -f infra/docker-compose.prod.yml exec api \
  node node_modules/tsx/dist/cli.mjs ../../packages/db/src/migrate.ts
```

Drizzle migrations in this project are additive (new columns/tables) by convention — review the generated SQL in `packages/db/migrations/` before running it against production data if it touches an existing column.

## Restore

```bash
infra/scripts/restore.sh /var/backups/smart-plant/smartplant-scheduled-20261107T020000Z.db.gpg
```

This takes its own pre-restore safety backup first (so a bad restore is itself recoverable), stops `api`, replaces the database file, deletes any stale `-wal`/`-shm` sidecars left by the previous instance, restarts `api`, and polls `/ready` for up to 60s. Requires `BACKUP_ENCRYPTION_PASSPHRASE` in the environment if the file is `.gpg`-encrypted (the default once `backup.sh` has `BACKUP_ENCRYPTION_PASSPHRASE` set — see `infra/README.md`).

Test this drill periodically against a scratch copy of the stack, not just when something is actually broken — a restore script nobody has run is not a verified one.

## Secret rotation

All secrets live in the server's `.env` (never committed — `.env.example` documents every key). After changing any of them, `docker compose -f infra/docker-compose.prod.yml up -d api` (or `restart api` if the image didn't change) to pick up the new values.

| Secret | Effect of rotating | Who else needs updating |
|---|---|---|
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | **Every existing access and refresh token stops verifying immediately** — all users are logged out and must log in again. There is no key-versioning in V1, so there's no graceful overlap window; plan rotation for a low-traffic window and tell users to expect a re-login. | Nobody else — only `api` verifies these. |
| `INTERNAL_MQTT_SHARED_SECRET` | Mosquitto's `mosquitto-go-auth` HTTP backend calls `/internal/mqtt/auth`/`/internal/mqtt/acl` with `?secret=...`; a stale value means **every device and the bridge fail to (re)connect** until both sides match. | Update it in the same `.env` the Mosquitto container reads it from (`infra/mosquitto/mosquitto.conf.template` is `envsubst`'d from the same env file) — restart `mosquitto` and `api` together. |
| `MQTT_BRIDGE_PASSWORD` | Validated entirely inside `apps/api`'s own `/internal/mqtt/auth` handler (`routes/internal-mqtt.ts`) against the same env var the bridge client (`plugins/mqtt.ts`) connects with — both sides read the same up-to-date value from one process, so only `api` needs restarting. | Nobody else. |
| Device `mqttSecret` (per device, not a shared secret) | Rotating one device's secret only affects that device — re-flash it (or update the Wokwi/simulator config) with the new value, or it can't authenticate until it does. There's no built-in "rotate device secret" endpoint yet; it would need a direct DB update (`UPDATE devices SET mqtt_secret_hash = ...`) plus re-provisioning the device. | Just that device. |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_WEBHOOK_SECRET` | Rotating the bot token invalidates the old one at Telegram's side too — get the new token from `@BotFather` first, then update `.env`, then restart. If `TELEGRAM_MODE=webhook`, also re-register the webhook URL with the new token. | Telegram (`@BotFather`), and the webhook registration if applicable. |

Never rotate `INTERNAL_MQTT_SHARED_SECRET` or `MQTT_BRIDGE_PASSWORD` without restarting `mosquitto`/`api` in the same maintenance window — a mismatch locks out every device until it's corrected.

## Health checks

| Endpoint | Meaning |
|---|---|
| `GET /health` | Process is up and serving HTTP. Does not check the database or MQTT. |
| `GET /ready` | `200` only if the SQLite connection responds **and** the MQTT bridge is currently connected to the broker; `503` with `{status, reason}` otherwise (`database_unavailable` or `mqtt_unavailable`). Use this for load-balancer/orchestrator readiness probes, not `/health`. |
| `GET /metrics` | MQTT message counts, watering ack-latency stats, DB file size, process uptime/memory — see `apps/api/src/metrics.ts`. |

## Backup schedule

`infra/scripts/backup.sh` is meant to run daily via host cron (see the comment at the top of that file for the exact crontab line) and before every deploy/migration. It encrypts with GPG when `BACKUP_ENCRYPTION_PASSPHRASE` is set, uploads off-site via `rclone` when `RCLONE_REMOTE` is set, and prunes local copies older than `RETENTION_DAYS` (default 14). See [`infra/README.md`](../infra/README.md) for the full backup/restore setup.
