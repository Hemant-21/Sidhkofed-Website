# =============================================================================
# SIDHKOFED CMS — Database & Media Restore Script (PowerShell)
# =============================================================================
# PowerShell equivalent of scripts/restore.sh for operators running from
# Windows PowerShell without a WSL2 terminal.
#
# Usage:
#   .\scripts\restore.ps1 -Db C:\sidhkofed\backups\db\db_20260627_020000.sql.gz
#   .\scripts\restore.ps1 -Media C:\sidhkofed\backups\media\media_20260627_020000.tar.gz
#   .\scripts\restore.ps1 -Db <path> -Media <path>
#   .\scripts\restore.ps1 -Latest          # restore from db_latest + media_latest
#
# WARNING: Restoring the database will OVERWRITE all current data.
#          Stop the api service before restoring to prevent in-flight writes.
# =============================================================================
[CmdletBinding()]
param(
    [string]$Db     = '',
    [string]$Media  = '',
    [switch]$Latest
)

$ErrorActionPreference = 'Stop'

# ── Configuration ──────────────────────────────────────────────────────────────
$BackupDir         = if ($env:BACKUP_DIR)         { $env:BACKUP_DIR }         else { 'C:\sidhkofed\backups' }
$PostgresContainer = if ($env:POSTGRES_CONTAINER) { $env:POSTGRES_CONTAINER } else { 'sidhkofed-postgres' }
$PostgresUser      = if ($env:POSTGRES_USER)      { $env:POSTGRES_USER }      else { 'sidhkofed' }
$PostgresDb        = if ($env:POSTGRES_DB)        { $env:POSTGRES_DB }        else { 'sidhkofed_cms' }
$MediaVolume       = if ($env:MEDIA_VOLUME)       { $env:MEDIA_VOLUME }       else { 'sidhkofed_media' }

if ($Latest) {
    $Db    = Join-Path $BackupDir 'db\db_latest.sql.gz'
    $Media = Join-Path $BackupDir 'media\media_latest.tar.gz'
}

if (-not $Db -and -not $Media) {
    Write-Host "Usage: .\scripts\restore.ps1 [-Db <file>] [-Media <file>] [-Latest]"
    exit 1
}

# ── Helpers ────────────────────────────────────────────────────────────────────
function Log([string]$Message) {
    Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] $Message"
}

function Confirm-Action([string]$Prompt) {
    $response = Read-Host "$Prompt [yes/NO]"
    return $response -eq 'yes'
}

# ── Database restore ───────────────────────────────────────────────────────────
function Restore-Database([string]$DbFile) {
    if (-not $DbFile) { return }

    if (-not (Test-Path $DbFile)) {
        Log "ERROR: Database backup file not found: $DbFile"
        exit 1
    }

    Log "Database backup to restore: $DbFile"
    Log "Target database: $PostgresDb on $PostgresContainer"
    Log ""
    Log "WARNING: This will DROP and recreate the database '$PostgresDb'."
    Log "         All current data will be permanently lost."
    Log ""

    if (-not (Confirm-Action 'Are you sure you want to restore?')) {
        Log 'Restore aborted.'
        exit 0
    }

    Log 'Stopping api container to prevent in-flight writes...'
    docker stop sidhkofed-api 2>$null
    # Ignore error if container is not running

    Log 'Dropping and recreating database...'
    docker exec $PostgresContainer psql -U $PostgresUser -d postgres `
        -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$PostgresDb' AND pid <> pg_backend_pid();" `
        -c "DROP DATABASE IF EXISTS $PostgresDb;" `
        -c "CREATE DATABASE $PostgresDb OWNER $PostgresUser;"

    # Copy the gz file into the postgres container, decompress and restore there.
    # This avoids needing any host-side gunzip or pipe encoding issues on Windows.
    Log 'Copying backup file into postgres container...'
    docker cp $DbFile "${PostgresContainer}:/tmp/db_restore.sql.gz"

    Log "Restoring database from $DbFile..."
    docker exec $PostgresContainer sh -c `
        "gunzip -c /tmp/db_restore.sql.gz | psql -U $PostgresUser -d $PostgresDb"

    # Cleanup temp file
    docker exec $PostgresContainer rm -f /tmp/db_restore.sql.gz

    Log 'Database restore complete'
    Log 'Run migrations to ensure the schema is up-to-date:'
    Log '  docker compose -f docker-compose.prod.yml run --rm migrate'
}

# ── Media restore ──────────────────────────────────────────────────────────────
function Restore-Media([string]$MediaFile) {
    if (-not $MediaFile) { return }

    if (-not (Test-Path $MediaFile)) {
        Log "ERROR: Media backup file not found: $MediaFile"
        exit 1
    }

    Log "Media backup to restore: $MediaFile"
    Log "Target volume: $MediaVolume"
    Log ""
    Log 'WARNING: This will REPLACE all content in the media volume.'
    Log ""

    if (-not (Confirm-Action 'Are you sure you want to restore media?')) {
        Log 'Media restore aborted.'
        return
    }

    Log "Restoring media from $MediaFile..."

    # Convert Windows path to Docker-compatible mount path.
    # On Windows, Docker Desktop accepts paths with forward slashes.
    $mediaDir  = (Split-Path $MediaFile -Parent).Replace('\', '/')
    $mediaName = Split-Path $MediaFile -Leaf

    docker run --rm `
        -v "${MediaVolume}:/target" `
        -v "${mediaDir}:/backup:ro" `
        alpine:3.20 `
        sh -c "rm -rf /target/* && tar xzf /backup/$mediaName -C /target"

    Log 'Media restore complete'
}

# ── Main ───────────────────────────────────────────────────────────────────────
Log '=== SIDHKOFED CMS Restore Started ==='
Restore-Database $Db
Restore-Media $Media

Log ''
Log '=== Restore Complete ==='
Log 'Restart the application:'
Log '  docker compose -f docker-compose.prod.yml up -d'
