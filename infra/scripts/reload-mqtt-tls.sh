#!/usr/bin/env bash
# Smart Plant — reload Mosquitto after Caddy renews the TLS certificate (T-53).
#
# Mosquitto reads cert/key files once at startup and does not pick up a
# renewed certificate on its own, so this restarts the container, which is
# enough for Mosquitto to re-open the files (connections drop briefly;
# devices reconnect automatically via their own retry/backoff).
#
# Wire this up as a Caddy on-renewal hook, or just run it from host cron
# shortly after Caddy's certmagic renewal window (certs are renewed well
# before expiry, so a daily check is safe):
#   30 3 * * * /opt/smart-plant/infra/scripts/reload-mqtt-tls.sh >> /var/log/smart-plant-tls-reload.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/../docker-compose.prod.yml"

echo "[reload-mqtt-tls] restarting mosquitto to pick up the current cert"
docker compose -f "$COMPOSE_FILE" restart mosquitto
echo "[reload-mqtt-tls] done"
