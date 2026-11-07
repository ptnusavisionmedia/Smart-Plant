# Infra — Smart Plant Emergency Detector

Local development infrastructure (Mosquitto) and production deployment config
(Caddy + Docker Compose). See `.agents/2-TECH-SPEC.md` §1/§5 for the full
architecture and security rationale.

## Local development

Two ways to run Mosquitto locally:

### Option A — faithful to production (mosquitto-go-auth, HTTP backend)

Broker auth/ACL decisions are delegated to the API's `/internal/mqtt/auth` and
`/internal/mqtt/acl` endpoints (T-18), same mechanism as production.

```bash
docker compose -f infra/docker-compose.yml --env-file .env up -d --build
```

The first build compiles the `mosquitto-go-auth` plugin from source (Go), so
it takes a few minutes. Requires the API running locally (`pnpm dev`) on
`API_HTTP_PORT` (default 3001) so the broker can reach
`/api/v1/internal/mqtt/auth` via `host.docker.internal`.

### Option B — quick local mode (static password/ACL, no plugin build)

```bash
docker compose -f infra/docker-compose.local-simple.yml up -d
touch infra/data/passwd
docker exec -it smart-plant-mosquitto mosquitto_passwd -b /mosquitto/config/passwd api-bridge <MQTT_BRIDGE_PASSWORD>
docker exec -it smart-plant-mosquitto mosquitto_passwd -b /mosquitto/config/passwd <device_uid> <mqtt_secret>
docker restart smart-plant-mosquitto
```

Use this when you just want to publish/subscribe test messages without
standing up the full API. New devices (claimed via the API) must be added
here by hand — Option A is the one that stays in sync automatically.

### Bringing infra down

```bash
docker compose -f infra/docker-compose.yml down
# or
docker compose -f infra/docker-compose.local-simple.yml down
```

Data persists in `infra/data/` (gitignored, kept via `.gitkeep`).

## Production

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d
```

Brings up `caddy` (TLS for `api`/`ws`), `api`, and `mosquitto` (TLS 8883) with
the SQLite data volume. See `infra/docker-compose.prod.yml` and
`docs/runbook.md` for firewall rules, backup, and restore procedures.

### TLS for MQTT

Caddy terminates TLS for HTTP/WS traffic but not for raw MQTT. Point
Mosquitto's `listener 8883` at certificates from Caddy's ACME storage volume
(`/data/caddy`) — see the `cert_file`/`key_file` directives commented in
`mosquitto/mosquitto.conf.template`, and rotate certs automatically by
restarting Mosquitto on Caddy's renewal hook (`infra/scripts/reload-mqtt-tls.sh`).

## Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | Local dev, mosquitto-go-auth (HTTP backend) |
| `docker-compose.local-simple.yml` | Local dev, static password/ACL fallback |
| `docker-compose.prod.yml` | Production stack (caddy, api, mosquitto) |
| `mosquitto/mosquitto.conf.template` | HTTP-auth-backend config (envsubst'd at container start) |
| `mosquitto/mosquitto.local.conf` | Static password/ACL fallback config |
| `mosquitto/acl.conf` | ACL for the fallback config only |
| `Caddyfile` | Production reverse proxy / TLS |
| `scripts/backup.sh`, `scripts/restore.sh` | SQLite backup/restore (T-54) |
| `scripts/reload-mqtt-tls.sh` | Restart Mosquitto after Caddy renews the TLS cert |
