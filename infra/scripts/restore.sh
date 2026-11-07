#!/usr/bin/env bash
# Smart Plant — SQLite restore (T-54).
#
# Restores a backup produced by backup.sh (optionally GPG-encrypted) into the
# running production stack's `api_data` volume, replacing the live database.
# ALWAYS takes a fresh backup of the current (possibly-broken) database
# before overwriting it, so a bad restore is itself recoverable.
#
# Usage:
#   infra/scripts/restore.sh /var/backups/smart-plant/smartplant-scheduled-20261107T020000Z.db.gpg
#
# Env: BACKUP_ENCRYPTION_PASSPHRASE is required if the file ends in .gpg.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/../docker-compose.prod.yml"
SOURCE_FILE="${1:?Usage: restore.sh <backup-file>}"

if [ ! -f "$SOURCE_FILE" ]; then
  echo "[restore] file not found: $SOURCE_FILE" >&2
  exit 1
fi

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

RESTORE_FILE="$SOURCE_FILE"
if [[ "$SOURCE_FILE" == *.gpg ]]; then
  : "${BACKUP_ENCRYPTION_PASSPHRASE:?BACKUP_ENCRYPTION_PASSPHRASE must be set to decrypt a .gpg backup}"
  echo "[restore] decrypting"
  RESTORE_FILE="$WORKDIR/restored.db"
  gpg --batch --yes --passphrase "$BACKUP_ENCRYPTION_PASSPHRASE" --decrypt -o "$RESTORE_FILE" "$SOURCE_FILE"
fi

echo "[restore] confirm: this will REPLACE the live database with $SOURCE_FILE"
read -r -p "Type 'yes' to continue: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "[restore] aborted"
  exit 1
fi

echo "[restore] taking a safety backup of the current database first"
"$SCRIPT_DIR/backup.sh" pre-restore-safety

echo "[restore] stopping api"
docker compose -f "$COMPOSE_FILE" stop api

echo "[restore] copying restored database into the api_data volume"
docker compose -f "$COMPOSE_FILE" cp "$RESTORE_FILE" "api:/data/smartplant.db"
# A fresh db file must not be opened alongside stale WAL/SHM sidecars from
# the previous instance — they reference offsets that no longer apply.
docker compose -f "$COMPOSE_FILE" run --rm --no-deps --entrypoint sh api -c \
  "rm -f /data/smartplant.db-wal /data/smartplant.db-shm"

echo "[restore] starting api"
docker compose -f "$COMPOSE_FILE" start api

echo "[restore] waiting for /ready"
for _ in $(seq 1 30); do
  if docker compose -f "$COMPOSE_FILE" exec -T api node -e \
    "fetch('http://127.0.0.1:3001/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
    echo "[restore] api is ready"
    exit 0
  fi
  sleep 2
done

echo "[restore] WARNING: api did not become ready within 60s — check 'docker compose logs api'" >&2
exit 1
