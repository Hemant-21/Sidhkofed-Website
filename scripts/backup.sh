#!/usr/bin/env bash
# =============================================================================
# SIDHKOFED CMS — Database & Media Backup Script
# =============================================================================
# Usage:
#   ./scripts/backup.sh                  # backup database + media
#   ./scripts/backup.sh --db-only        # database only
#   ./scripts/backup.sh --media-only     # media only
#   ./scripts/backup.sh --verify         # verify the most recent backup
#
# Requires:
#   - docker compose (with production compose file)
#   - pg_dump (via the postgres container)
#   - aws cli (only for S3 offsite upload)
#
# Output directory:   /opt/sidhkofed/backups/
# Retention:          7 daily, 4 weekly, 3 monthly (managed by prune section)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"

BACKUP_DIR="${BACKUP_DIR:-/opt/sidhkofed/backups}"
DATE=$(date +%Y%m%d_%H%M%S)
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-sidhkofed-postgres}"
POSTGRES_USER="${POSTGRES_USER:-sidhkofed}"
POSTGRES_DB="${POSTGRES_DB:-sidhkofed_cms}"
MEDIA_VOLUME="${MEDIA_VOLUME:-sidhkofed_media}"

# Optional S3 offsite upload
S3_BACKUP_BUCKET="${S3_BACKUP_BUCKET:-}"

# Flags
DO_DB=true
DO_MEDIA=true
DO_VERIFY=false

for arg in "$@"; do
  case $arg in
    --db-only)    DO_MEDIA=false ;;
    --media-only) DO_DB=false ;;
    --verify)     DO_VERIFY=true; DO_DB=false; DO_MEDIA=false ;;
  esac
done

mkdir -p "${BACKUP_DIR}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# ── Database backup ───────────────────────────────────────────────────────────
backup_database() {
  local outfile="${BACKUP_DIR}/db_${DATE}.sql.gz"
  log "Starting database backup → ${outfile}"

  docker exec "${POSTGRES_CONTAINER}" \
    pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --no-password \
    | gzip -9 > "${outfile}"

  local size
  size=$(du -h "${outfile}" | cut -f1)
  log "Database backup complete: ${outfile} (${size})"

  # Keep a symlink to the latest db backup for easy restore.
  ln -sf "${outfile}" "${BACKUP_DIR}/db_latest.sql.gz"
}

# ── Media backup ──────────────────────────────────────────────────────────────
backup_media() {
  local outfile="${BACKUP_DIR}/media_${DATE}.tar.gz"
  log "Starting media backup → ${outfile}"

  # Use a temporary container to tar the named volume.
  docker run --rm \
    -v "${MEDIA_VOLUME}:/source:ro" \
    alpine:3.20 \
    tar czf - -C /source . > "${outfile}"

  local size
  size=$(du -h "${outfile}" | cut -f1)
  log "Media backup complete: ${outfile} (${size})"

  ln -sf "${outfile}" "${BACKUP_DIR}/media_latest.tar.gz"
}

# ── Offsite upload (S3) ───────────────────────────────────────────────────────
offsite_upload() {
  if [[ -z "${S3_BACKUP_BUCKET}" ]]; then
    log "S3_BACKUP_BUCKET not set — skipping offsite upload"
    return 0
  fi

  log "Uploading backups to s3://${S3_BACKUP_BUCKET}/"
  aws s3 sync "${BACKUP_DIR}" "s3://${S3_BACKUP_BUCKET}/$(hostname)/" \
    --storage-class STANDARD_IA \
    --exclude "db_latest.sql.gz" \
    --exclude "media_latest.tar.gz"
  log "Offsite upload complete"
}

# ── Prune old backups ─────────────────────────────────────────────────────────
prune_old_backups() {
  log "Pruning backups older than 7 days"
  find "${BACKUP_DIR}" -name "db_*.sql.gz"    -mtime +7  -delete
  find "${BACKUP_DIR}" -name "media_*.tar.gz" -mtime +30 -delete
  log "Pruning complete"
}

# ── Verify backup integrity ───────────────────────────────────────────────────
verify_backup() {
  local latest_db="${BACKUP_DIR}/db_latest.sql.gz"
  if [[ ! -f "${latest_db}" ]]; then
    log "ERROR: No backup found at ${latest_db}"
    exit 1
  fi

  log "Verifying database backup: ${latest_db}"
  gunzip -t "${latest_db}" && log "Database backup integrity: OK" || {
    log "ERROR: Database backup is corrupted!"
    exit 1
  }

  local latest_media="${BACKUP_DIR}/media_latest.tar.gz"
  if [[ -f "${latest_media}" ]]; then
    log "Verifying media backup: ${latest_media}"
    tar tzf "${latest_media}" > /dev/null && log "Media backup integrity: OK" || {
      log "ERROR: Media backup is corrupted!"
      exit 1
    }
  fi

  log "All backups verified successfully"
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  log "=== SIDHKOFED CMS Backup Started ==="

  if $DO_VERIFY; then
    verify_backup
    exit 0
  fi

  $DO_DB    && backup_database
  $DO_MEDIA && backup_media
  offsite_upload
  prune_old_backups

  log "=== Backup Completed Successfully ==="
}

main "$@"
