#!/usr/bin/env bash
# =============================================================================
# SIDHKOFED CMS — Database & Media Restore Script
# =============================================================================
# Usage:
#   ./scripts/restore.sh --db /path/to/db_20260627_120000.sql.gz
#   ./scripts/restore.sh --media /path/to/media_20260627_120000.tar.gz
#   ./scripts/restore.sh --db /path/to/backup.sql.gz --media /path/to/media.tar.gz
#   ./scripts/restore.sh --latest         # restore from db_latest + media_latest
#
# WARNING: Restoring the database will OVERWRITE all current data.
#          Stop the api service before restoring to prevent in-flight writes.
# =============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/sidhkofed/backups}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-sidhkofed-postgres}"
POSTGRES_USER="${POSTGRES_USER:-sidhkofed}"
POSTGRES_DB="${POSTGRES_DB:-sidhkofed_cms}"
MEDIA_VOLUME="${MEDIA_VOLUME:-sidhkofed_media}"

DB_FILE=""
MEDIA_FILE=""
USE_LATEST=false

for arg in "$@"; do
  case $arg in
    --db)       shift; DB_FILE="$1" ;;
    --media)    shift; MEDIA_FILE="$1" ;;
    --latest)   USE_LATEST=true ;;
  esac
done

if $USE_LATEST; then
  DB_FILE="${BACKUP_DIR}/db_latest.sql.gz"
  MEDIA_FILE="${BACKUP_DIR}/media_latest.tar.gz"
fi

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

confirm() {
  read -r -p "$1 [yes/NO]: " response
  [[ "${response,,}" == "yes" ]]
}

# ── Database restore ──────────────────────────────────────────────────────────
restore_database() {
  [[ -z "${DB_FILE}" ]] && return 0

  if [[ ! -f "${DB_FILE}" ]]; then
    log "ERROR: Database backup file not found: ${DB_FILE}"
    exit 1
  fi

  log "Database backup to restore: ${DB_FILE}"
  log "Target database: ${POSTGRES_DB} on ${POSTGRES_CONTAINER}"
  log ""
  log "WARNING: This will DROP and recreate the database '${POSTGRES_DB}'."
  log "         All current data will be permanently lost."
  log ""

  confirm "Are you sure you want to restore?" || { log "Restore aborted."; exit 0; }

  log "Stopping api container to prevent in-flight writes..."
  docker stop sidhkofed-api 2>/dev/null || true

  log "Dropping and recreating database..."
  docker exec "${POSTGRES_CONTAINER}" \
    psql -U "${POSTGRES_USER}" -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${POSTGRES_DB}' AND pid <> pg_backend_pid();" \
    -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};" \
    -c "CREATE DATABASE ${POSTGRES_DB} OWNER ${POSTGRES_USER};"

  log "Restoring database from ${DB_FILE}..."
  gunzip -c "${DB_FILE}" | \
    docker exec -i "${POSTGRES_CONTAINER}" \
    psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"

  log "Database restore complete"
  log "Run migrations to ensure the schema is up-to-date:"
  log "  docker compose -f docker-compose.prod.yml run --rm migrate"
}

# ── Media restore ─────────────────────────────────────────────────────────────
restore_media() {
  [[ -z "${MEDIA_FILE}" ]] && return 0

  if [[ ! -f "${MEDIA_FILE}" ]]; then
    log "ERROR: Media backup file not found: ${MEDIA_FILE}"
    exit 1
  fi

  log "Media backup to restore: ${MEDIA_FILE}"
  log "Target volume: ${MEDIA_VOLUME}"
  log ""
  log "WARNING: This will REPLACE all content in the media volume."
  log ""

  confirm "Are you sure you want to restore media?" || { log "Media restore aborted."; return 0; }

  log "Restoring media from ${MEDIA_FILE}..."
  docker run --rm \
    -v "${MEDIA_VOLUME}:/target" \
    -v "$(dirname "${MEDIA_FILE}"):/backup:ro" \
    alpine:3.20 \
    sh -c "rm -rf /target/* && tar xzf /backup/$(basename "${MEDIA_FILE}") -C /target"

  log "Media restore complete"
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  if [[ -z "${DB_FILE}" && -z "${MEDIA_FILE}" ]]; then
    echo "Usage: $0 [--db <file>] [--media <file>] [--latest]"
    exit 1
  fi

  log "=== SIDHKOFED CMS Restore Started ==="
  restore_database
  restore_media

  log ""
  log "=== Restore Complete ==="
  log "Restart the application:"
  log "  docker compose -f docker-compose.prod.yml up -d"
}

main "$@"
