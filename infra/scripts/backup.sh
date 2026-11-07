#!/usr/bin/env bash
# Smart Plant — SQLite backup (T-54).
#
# Takes an online backup of the production database (via better-sqlite3's
# .backup() — safe against a live WAL-mode writer), pulls it out of the api
# container, optionally GPG-encrypts and uploads it off-site via rclone, and
# prunes local copies older than RETENTION_DAYS.
#
# Run daily via host cron, e.g.:
#   0 2 * * * /opt/smart-plant/infra/scripts/backup.sh >> /var/log/smart-plant-backup.log 2>&1
# Also run manually (with --label pre-migration) before any DB migration.
#
# Env (set in the shell or sourced from /opt/smart-plant/.env):
#   BACKUP_DIR                 host dir to keep local backups (default /var/backups/smart-plant)
#   RETENTION_DAYS             how many days of local backups to keep (default 14)
#   BACKUP_ENCRYPTION_PASSPHRASE  if set, backups are GPG-symmetric-encrypted
#   RCLONE_REMOTE               if set (e.g. "s3:my-bucket/smart-plant"), encrypted backups are uploaded there

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/../docker-compose.prod.yml"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/smart-plant}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
LABEL="${1:-scheduled}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILENAME="smartplant-${LABEL}-${TIMESTAMP}.db"
CONTAINER_PATH="/data/backups/${FILENAME}"

mkdir -p "$BACKUP_DIR"

echo "[backup] taking online backup inside the api container -> ${CONTAINER_PATH}"
docker compose -f "$COMPOSE_FILE" exec -T api node node_modules/tsx/dist/cli.mjs src/tools/backup-db.ts "$CONTAINER_PATH"

echo "[backup] copying out to ${BACKUP_DIR}/${FILENAME}"
docker compose -f "$COMPOSE_FILE" cp "api:${CONTAINER_PATH}" "${BACKUP_DIR}/${FILENAME}"
docker compose -f "$COMPOSE_FILE" exec -T api rm -f "$CONTAINER_PATH"

FINAL_PATH="${BACKUP_DIR}/${FILENAME}"

if [ -n "${BACKUP_ENCRYPTION_PASSPHRASE:-}" ]; then
  echo "[backup] encrypting"
  gpg --batch --yes --passphrase "$BACKUP_ENCRYPTION_PASSPHRASE" --symmetric --cipher-algo AES256 \
    -o "${FINAL_PATH}.gpg" "$FINAL_PATH"
  rm -f "$FINAL_PATH"
  FINAL_PATH="${FINAL_PATH}.gpg"
else
  echo "[backup] WARNING: BACKUP_ENCRYPTION_PASSPHRASE not set — backup stored unencrypted at ${FINAL_PATH}"
fi

if [ -n "${RCLONE_REMOTE:-}" ]; then
  echo "[backup] uploading to ${RCLONE_REMOTE}"
  rclone copy "$FINAL_PATH" "$RCLONE_REMOTE"
else
  echo "[backup] RCLONE_REMOTE not set — skipping off-site upload (local copy only, not disaster-safe)"
fi

echo "[backup] pruning local backups older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'smartplant-*' -mtime "+${RETENTION_DAYS}" -print -delete

echo "[backup] done: ${FINAL_PATH}"
