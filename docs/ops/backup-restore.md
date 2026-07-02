# SIDHKOFED CMS — Backup & Restore

## What is backed up

| Asset | Tool | Format | Default retention |
|-------|------|--------|-------------------|
| PostgreSQL database | `pg_dump` | gzip SQL | 7 days |
| Media files (local storage) | `tar czf` via Docker | `.tar.gz` | 30 days |
| Nginx configuration | git-tracked | — | infinite |
| Environment file | external vault | — | vault policy |

> If `STORAGE_PROVIDER=s3`, media files are stored in your S3 bucket — AWS handles their redundancy and you only need to back up the database.

---

## Backup script

Location: [scripts/backup.sh](../../scripts/backup.sh)

```bash
# Full backup (database + media)
./scripts/backup.sh

# Database only
./scripts/backup.sh --db-only

# Media only
./scripts/backup.sh --media-only

# Verify the last backup's integrity without creating a new one
./scripts/backup.sh --verify
```

Backup files are written to `/opt/sidhkofed/backups/` with timestamped names:

```
/opt/sidhkofed/backups/
├── db_20260627_020000.sql.gz
├── db_latest.sql.gz            → symlink to latest
├── media_20260627_020000.tar.gz
└── media_latest.tar.gz         → symlink to latest
```

### Offsite upload to S3

Set `S3_BACKUP_BUCKET` in the environment to automatically upload completed backups:

```bash
export S3_BACKUP_BUCKET=my-company-backups
./scripts/backup.sh
```

Files are uploaded with `STANDARD_IA` storage class to reduce cost.

---

## Automated daily backup

### Linux / WSL2 (recommended)

```bash
# Run at 02:00 AM daily (inside WSL2 Ubuntu terminal on Windows Server)
crontab -e
# Add:
0 2 * * * /opt/sidhkofed/scripts/backup.sh >> /var/log/sidhkofed-backup.log 2>&1

# Verify the previous night's backup at 06:00 AM
0 6 * * * /opt/sidhkofed/scripts/backup.sh --verify >> /var/log/sidhkofed-backup.log 2>&1
```

### Windows Server (PowerShell / Task Scheduler)

If running from Windows PowerShell without WSL2, use the PowerShell script and Windows Task Scheduler:

```powershell
# Create a daily scheduled task at 02:00 AM
$action  = New-ScheduledTaskAction -Execute 'powershell.exe' `
           -Argument '-NonInteractive -File "C:\sidhkofed\scripts\backup.ps1" >> C:\sidhkofed\logs\backup.log 2>&1'
$trigger = New-ScheduledTaskTrigger -Daily -At '02:00'
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName 'SIDHKOFED-Backup' -Action $action -Trigger $trigger -Principal $principal

# Verify manually
.\scripts\backup.ps1 -Verify
```

See `docs/ops/windows-server-deployment.md` for the full Windows Server setup guide.

---

## Restore procedure

Location: [scripts/restore.sh](../../scripts/restore.sh) · [scripts/restore.ps1](../../scripts/restore.ps1) (Windows)

> **Warning**: restoring the database overwrites all current data. This is irreversible.

### 1. Restore database from a specific file

```bash
./scripts/restore.sh --db /opt/sidhkofed/backups/db_20260627_020000.sql.gz
```

### 2. Restore from the latest symlinks

```bash
./scripts/restore.sh --latest
```

### 3. Restore media only

```bash
./scripts/restore.sh --media /opt/sidhkofed/backups/media_20260627_020000.tar.gz
```

### 4. Restart the application after restore

```bash
# Confirm the api is stopped (the restore script stops it automatically)
docker compose -f docker-compose.prod.yml ps api

# Run any pending migrations (safe — idempotent)
docker compose -f docker-compose.prod.yml run --rm migrate

# Bring everything back up
docker compose -f docker-compose.prod.yml up -d
```

---

## Manual backup (without the script)

```bash
# Database
docker exec sidhkofed-postgres \
  pg_dump -U sidhkofed -d sidhkofed_cms \
  | gzip -9 > ~/backup-$(date +%Y%m%d).sql.gz

# Media volume
docker run --rm \
  -v sidhkofed_media:/source:ro \
  alpine:3.20 \
  tar czf - -C /source . > ~/media-$(date +%Y%m%d).tar.gz
```

---

## Manual restore (without the script)

```bash
# 1. Stop the api
docker compose -f docker-compose.prod.yml stop api

# 2. Drop and recreate the database
docker exec sidhkofed-postgres \
  psql -U sidhkofed -d postgres \
  -c "DROP DATABASE IF EXISTS sidhkofed_cms;" \
  -c "CREATE DATABASE sidhkofed_cms OWNER sidhkofed;"

# 3. Restore
gunzip -c ~/backup-20260627.sql.gz | \
  docker exec -i sidhkofed-postgres \
  psql -U sidhkofed -d sidhkofed_cms

# 4. Run migrations
docker compose -f docker-compose.prod.yml run --rm migrate

# 5. Restart
docker compose -f docker-compose.prod.yml up -d
```

---

## Backup verification checklist

Run monthly (or after any backup system change):

- [ ] `./scripts/backup.sh --verify` exits 0
- [ ] Backup file size is non-zero and growing
- [ ] Restore the database to a **test environment** and confirm application starts
- [ ] Confirm S3 offsite upload if enabled (`aws s3 ls s3://bucket/hostname/`)
- [ ] Check log file at `/var/log/sidhkofed-backup.log` for errors

---

## Retention policy

| Type | Retention | Notes |
|------|-----------|-------|
| Daily database | 7 days | Managed by `find … -mtime +7 -delete` in backup.sh |
| Daily media | 30 days | Managed by `find … -mtime +30 -delete` in backup.sh |
| S3 offsite | Configure S3 lifecycle rules | Recommended: 30 days STANDARD_IA → Glacier after 90 days |
