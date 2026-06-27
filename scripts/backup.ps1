# =============================================================================
# SIDHKOFED CMS — Database & Media Backup Script (PowerShell)
# =============================================================================
# PowerShell equivalent of scripts/backup.sh for operators running from
# Windows PowerShell without a WSL2 terminal.
#
# Usage:
#   .\scripts\backup.ps1                  # backup database + media
#   .\scripts\backup.ps1 -DbOnly          # database only
#   .\scripts\backup.ps1 -MediaOnly       # media only
#   .\scripts\backup.ps1 -Verify          # verify the most recent backup
#
# Requires:
#   - Docker Desktop or Docker Engine accessible from PowerShell
#   - AWS CLI (only for S3 offsite upload)
#
# Output directory: C:\sidhkofed\backups\ (override with $env:BACKUP_DIR)
# =============================================================================
[CmdletBinding()]
param(
    [switch]$DbOnly,
    [switch]$MediaOnly,
    [switch]$Verify
)

$ErrorActionPreference = 'Stop'

# ── Configuration ──────────────────────────────────────────────────────────────
$ProjectDir       = Split-Path -Parent $PSScriptRoot
$ComposeFile      = Join-Path $ProjectDir 'docker-compose.prod.yml'
$BackupDir        = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { 'C:\sidhkofed\backups' }
$Date             = (Get-Date).ToString('yyyyMMdd_HHmmss')
$PostgresContainer = if ($env:POSTGRES_CONTAINER) { $env:POSTGRES_CONTAINER } else { 'sidhkofed-postgres' }
$PostgresUser     = if ($env:POSTGRES_USER)      { $env:POSTGRES_USER }      else { 'sidhkofed' }
$PostgresDb       = if ($env:POSTGRES_DB)        { $env:POSTGRES_DB }        else { 'sidhkofed_cms' }
$MediaVolume      = if ($env:MEDIA_VOLUME)       { $env:MEDIA_VOLUME }       else { 'sidhkofed_media' }
$S3Bucket         = if ($env:S3_BACKUP_BUCKET)   { $env:S3_BACKUP_BUCKET }   else { '' }

$DoDb     = -not $MediaOnly.IsPresent
$DoMedia  = -not $DbOnly.IsPresent
$DoVerify = $Verify.IsPresent

if ($DoVerify) { $DoDb = $false; $DoMedia = $false }

# ── Helpers ────────────────────────────────────────────────────────────────────
function Log([string]$Message) {
    Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] $Message"
}

function Confirm-Action([string]$Prompt) {
    $response = Read-Host "$Prompt [yes/NO]"
    return $response -eq 'yes'
}

# ── Database backup ────────────────────────────────────────────────────────────
function Backup-Database {
    $dbDir  = Join-Path $BackupDir 'db'
    $outfile = Join-Path $dbDir "db_$Date.sql.gz"
    New-Item -ItemType Directory -Force -Path $dbDir | Out-Null

    Log "Starting database backup → $outfile"

    # Run pg_dump | gzip entirely inside the postgres container and redirect
    # binary stdout to the output file using Start-Process to avoid PowerShell
    # encoding the byte stream.
    $proc = Start-Process docker -ArgumentList @(
        'exec', $PostgresContainer,
        'sh', '-c',
        "pg_dump -U $PostgresUser -d $PostgresDb --no-password | gzip -9"
    ) -RedirectStandardOutput $outfile -NoNewWindow -Wait -PassThru

    if ($proc.ExitCode -ne 0) {
        Log "ERROR: pg_dump failed (exit $($proc.ExitCode))"
        exit 1
    }

    $size = (Get-Item $outfile).Length / 1KB
    Log ("Database backup complete: $outfile ({0:N0} KB)" -f $size)

    # Latest symlink (Windows: junction point via cmd /c mklink)
    $latest = Join-Path $dbDir 'db_latest.sql.gz'
    if (Test-Path $latest) { Remove-Item $latest -Force }
    Copy-Item $outfile $latest
}

# ── Media backup ───────────────────────────────────────────────────────────────
function Backup-Media {
    $mediaDir = Join-Path $BackupDir 'media'
    $outfile   = Join-Path $mediaDir "media_$Date.tar.gz"
    New-Item -ItemType Directory -Force -Path $mediaDir | Out-Null

    Log "Starting media backup → $outfile"

    # tar runs inside an Alpine container — works on Windows Docker Desktop too.
    $proc = Start-Process docker -ArgumentList @(
        'run', '--rm',
        '-v', "${MediaVolume}:/source:ro",
        'alpine:3.20',
        'tar', 'czf', '-', '-C', '/source', '.'
    ) -RedirectStandardOutput $outfile -NoNewWindow -Wait -PassThru

    if ($proc.ExitCode -ne 0) {
        Log "ERROR: Media tar failed (exit $($proc.ExitCode))"
        exit 1
    }

    $size = (Get-Item $outfile).Length / 1KB
    Log ("Media backup complete: $outfile ({0:N0} KB)" -f $size)

    $latest = Join-Path $mediaDir 'media_latest.tar.gz'
    if (Test-Path $latest) { Remove-Item $latest -Force }
    Copy-Item $outfile $latest
}

# ── S3 offsite upload ──────────────────────────────────────────────────────────
function Upload-Offsite {
    if (-not $S3Bucket) {
        Log 'S3_BACKUP_BUCKET not set — skipping offsite upload'
        return
    }

    Log "Uploading backups to s3://$S3Bucket/"
    $hostname = $env:COMPUTERNAME.ToLower()
    & aws s3 sync $BackupDir "s3://$S3Bucket/$hostname/" `
        --storage-class STANDARD_IA `
        --exclude 'db_latest.sql.gz' `
        --exclude 'media_latest.sql.gz'
    if ($LASTEXITCODE -ne 0) { Log "ERROR: S3 upload failed"; exit 1 }
    Log 'Offsite upload complete'
}

# ── Prune old backups ──────────────────────────────────────────────────────────
function Remove-OldBackups {
    Log 'Pruning old backups'

    $dbDir    = Join-Path $BackupDir 'db'
    $mediaDir = Join-Path $BackupDir 'media'
    $cutoffDb    = (Get-Date).AddDays(-7)
    $cutoffMedia = (Get-Date).AddDays(-30)

    if (Test-Path $dbDir) {
        Get-ChildItem $dbDir -Filter 'db_*.sql.gz' |
            Where-Object { $_.LastWriteTime -lt $cutoffDb -and $_.Name -ne 'db_latest.sql.gz' } |
            ForEach-Object { Log "  Removing $($_.Name)"; Remove-Item $_.FullName -Force }
    }

    if (Test-Path $mediaDir) {
        Get-ChildItem $mediaDir -Filter 'media_*.tar.gz' |
            Where-Object { $_.LastWriteTime -lt $cutoffMedia -and $_.Name -ne 'media_latest.tar.gz' } |
            ForEach-Object { Log "  Removing $($_.Name)"; Remove-Item $_.FullName -Force }
    }

    Log 'Pruning complete'
}

# ── Verify backup integrity ────────────────────────────────────────────────────
function Test-Backups {
    $latestDb = Join-Path $BackupDir 'db\db_latest.sql.gz'
    if (-not (Test-Path $latestDb)) {
        Log "ERROR: No backup found at $latestDb"
        exit 1
    }

    Log "Verifying database backup: $latestDb"
    # gunzip -t runs inside postgres container to avoid needing host-side gunzip
    docker exec $PostgresContainer sh -c "gunzip -t /dev/stdin" `
        -Encoding Byte < (Get-Content $latestDb -AsByteStream -Raw | & { process { $_ } })
    # Simpler: use docker run to test the gz file via a volume mount
    $dir  = Split-Path $latestDb -Parent
    $file = Split-Path $latestDb -Leaf
    $result = docker run --rm `
        -v "${dir}:/backup:ro" `
        alpine:3.20 `
        sh -c "gunzip -t /backup/$file && echo OK"
    if ($result -notmatch 'OK') {
        Log 'ERROR: Database backup integrity check failed'
        exit 1
    }
    Log 'Database backup integrity: OK'

    $latestMedia = Join-Path $BackupDir 'media\media_latest.tar.gz'
    if (Test-Path $latestMedia) {
        Log "Verifying media backup: $latestMedia"
        $mdir  = Split-Path $latestMedia -Parent
        $mfile = Split-Path $latestMedia -Leaf
        $mresult = docker run --rm `
            -v "${mdir}:/backup:ro" `
            alpine:3.20 `
            sh -c "tar tzf /backup/$mfile > /dev/null && echo OK"
        if ($mresult -notmatch 'OK') {
            Log 'ERROR: Media backup integrity check failed'
            exit 1
        }
        Log 'Media backup integrity: OK'
    }

    Log 'All backups verified successfully'
}

# ── Main ───────────────────────────────────────────────────────────────────────
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

Log '=== SIDHKOFED CMS Backup Started ==='

if ($DoVerify) {
    Test-Backups
    exit 0
}

if ($DoDb)    { Backup-Database }
if ($DoMedia) { Backup-Media }
Upload-Offsite
Remove-OldBackups

Log '=== Backup Completed Successfully ==='
