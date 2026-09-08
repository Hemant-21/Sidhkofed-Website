param(
  [string]$EnvFile = "D:\SIDHKOFED\env\db-backup.env",
  [string]$BackupRoot = "D:\DB-Backups",
  [string]$PgDumpPath = "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe",
  [int]$RetentionDays = 7,
  [switch]$VerifyLatest
)

$ErrorActionPreference = "Stop"

function Write-BackupLog {
  param([string]$Message)

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $line = "$timestamp $Message"
  Write-Output $line

  if (-not (Test-Path $BackupRoot)) {
    New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null
  }

  Add-Content -Path (Join-Path $BackupRoot "backup.log") -Value $line
}

function Read-DotEnv {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    throw "Env file not found: $Path"
  }

  $values = @{}

  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if ($line.Length -eq 0 -or $line.StartsWith("#")) {
      return
    }

    $index = $line.IndexOf("=")
    if ($index -lt 1) {
      return
    }

    $key = $line.Substring(0, $index).Trim()
    $value = $line.Substring($index + 1).Trim()

    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    $values[$key] = $value
  }

  return $values
}

if (-not (Test-Path $BackupRoot)) {
  New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null
}

$pgRestorePath = Join-Path (Split-Path $PgDumpPath -Parent) "pg_restore.exe"

if (-not (Test-Path $PgDumpPath)) {
  throw "pg_dump not found: $PgDumpPath"
}

if (-not (Test-Path $pgRestorePath)) {
  throw "pg_restore not found: $pgRestorePath"
}

if ($VerifyLatest) {
  $latestFile = Join-Path $BackupRoot "sidhkofed_latest.dump"
  if (-not (Test-Path $latestFile)) {
    throw "Latest backup file not found: $latestFile"
  }

  Write-BackupLog "Verifying latest database backup: $latestFile"
  & $pgRestorePath --list $latestFile | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Backup verification failed for $latestFile"
  }

  Write-BackupLog "Backup verification passed"
  exit 0
}

$envValues = Read-DotEnv $EnvFile
$databaseUrl = $envValues["DATABASE_URL"]

if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
  throw "DATABASE_URL is missing in $EnvFile"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $BackupRoot "sidhkofed_db_$stamp.dump"
$latestFile = Join-Path $BackupRoot "sidhkofed_latest.dump"

Write-BackupLog "Starting database backup to $backupFile"

& $PgDumpPath --format=custom --no-owner --no-acl --file $backupFile $databaseUrl
if ($LASTEXITCODE -ne 0) {
  throw "pg_dump failed with exit code $LASTEXITCODE"
}

$backupInfo = Get-Item $backupFile
if ($backupInfo.Length -le 0) {
  throw "Backup file is empty: $backupFile"
}

Copy-Item $backupFile $latestFile -Force
Write-BackupLog "Database backup completed: $backupFile ($($backupInfo.Length) bytes)"

Write-BackupLog "Verifying database backup"
& $pgRestorePath --list $backupFile | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Backup verification failed for $backupFile"
}

Write-BackupLog "Backup verification passed"

$cutoff = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem $BackupRoot -Filter "sidhkofed_db_*.dump" |
  Where-Object { $_.LastWriteTime -lt $cutoff } |
  Remove-Item -Force

Write-BackupLog "Retention cleanup completed, keeping $RetentionDays days"
