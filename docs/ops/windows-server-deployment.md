# SIDHKOFED CMS — Windows Server Deployment Guide

This guide supplements the main [deployment.md](deployment.md). Read that document first for the full deployment flow; this guide covers only the Windows-specific setup steps.

---

## Recommended approach: WSL2 + Docker Engine

**Use WSL2 (Windows Subsystem for Linux 2) as your primary operations shell.**

WSL2 runs a real Ubuntu 22.04 environment inside a lightweight Hyper-V virtual machine on your Windows Server. Once WSL2 is running:

- Every command in `docs/ops/deployment.md`, `operations-manual.md`, `backup-restore.md`, and `disaster-recovery.md` works identically — no translation needed.
- `backup.sh` and `restore.sh` run without modification.
- Cron runs inside WSL2.
- Docker Engine runs inside WSL2 and starts Linux containers — the same container images that would run on a Linux server.

> **Why not Docker Desktop?** Docker Desktop for Windows is designed for developer workstations. On a production server, Docker Engine installed directly inside WSL2 is lighter, has no GUI dependency, and does not require an annual subscription.

---

## Architecture on Windows Server

```
Windows Server 2019 / 2022
│
├── Hyper-V (built-in)
│   └── WSL2 lightweight VM
│       ├── Ubuntu 22.04
│       ├── Docker Engine (Linux containers)
│       │   ├── sidhkofed-api
│       │   ├── sidhkofed-admin
│       │   ├── sidhkofed-web
│       │   ├── sidhkofed-postgres
│       │   ├── sidhkofed-redis
│       │   └── sidhkofed-nginx  ← listens on :80 and :443
│       └── cron (backup schedule)
│
└── Windows Firewall
    └── Inbound rules: port 80 (HTTP) and 443 (HTTPS) allowed
```

Nginx inside WSL2 binds to ports 80 and 443. Windows forwards inbound traffic to WSL2 automatically via the WSL2 port proxy.

---

## Step 1 — Enable Hyper-V and WSL2

Run in an elevated PowerShell:

```powershell
# Enable required Windows features
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -NoRestart
Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -NoRestart
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -NoRestart

# Restart the server
Restart-Computer
```

After restart, in PowerShell:

```powershell
# Set WSL to version 2
wsl --set-default-version 2

# Update the WSL kernel
wsl --update

# Install Ubuntu 22.04
wsl --install -d Ubuntu-22.04
```

When Ubuntu launches for the first time, create a Unix username and password (this is for the WSL2 environment only; it does not need to match your Windows account).

---

## Step 2 — Install Docker Engine inside WSL2

Open the WSL2 Ubuntu terminal (run `wsl` from PowerShell, or search "Ubuntu" in Start Menu):

```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install Docker Engine (same as on a native Linux server)
curl -fsSL https://get.docker.com | sh

# Add your WSL2 user to the docker group
sudo usermod -aG docker $USER

# Start Docker (in WSL2, systemd may not be active — use service instead)
sudo service docker start

# Verify
docker --version
docker compose version
```

> **Note on systemd:** WSL2 supports systemd from Ubuntu 22.04+ (`systemd=true` in `/etc/wsl.conf`), but the `sudo service docker start` method works on all WSL2 versions without extra configuration.

Enable systemd (optional but recommended for auto-starting Docker):

```bash
# Add to /etc/wsl.conf (create if missing)
echo -e "[boot]\nsystemd=true" | sudo tee /etc/wsl.conf
```

Then restart WSL from PowerShell: `wsl --shutdown`, wait a few seconds, then `wsl` to re-enter.

---

## Step 3 — Configure auto-start on Windows boot

WSL2 does not start automatically when Windows boots. Configure it via Windows Task Scheduler:

**Option A — Task Scheduler GUI:**
1. Open Task Scheduler (`taskschd.msc`)
2. Create Task → Triggers → At startup
3. Action → Start a program:
   - Program: `C:\Windows\System32\wsl.exe`
   - Arguments: `-d Ubuntu-22.04 -e bash -c "sudo service docker start && sudo service cron start"`
4. General → Run whether user is logged in or not; Run with highest privileges

**Option B — PowerShell (automated):**

```powershell
$action = New-ScheduledTaskAction -Execute "wsl.exe" -Argument '-d Ubuntu-22.04 -e bash -c "sudo service docker start && sudo service cron start"'
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "SIDHKOFED-WSL2-Start" -Action $action -Trigger $trigger -Principal $principal
```

---

## Step 4 — Open Windows Firewall ports

Run in elevated PowerShell:

```powershell
# Allow HTTP
New-NetFirewallRule -DisplayName "SIDHKOFED HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# Allow HTTPS
New-NetFirewallRule -DisplayName "SIDHKOFED HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

All other ports (5432, 6379, 4000, 3001, 3002) remain closed to the internet — they are internal to the Docker network inside WSL2.

---

## Step 5 — Clone and set up the project

From inside the WSL2 terminal:

```bash
# Use the WSL2 filesystem — NOT a Windows path like /mnt/c/...
sudo mkdir -p /opt/sidhkofed
sudo chown $USER:$USER /opt/sidhkofed
git clone https://github.com/sidhkofed/sidhkofed-website.git /opt/sidhkofed
cd /opt/sidhkofed
```

> **Important:** Always use the WSL2 filesystem (`/opt/`, `/home/`) rather than Windows paths (`/mnt/c/`). Filesystem performance is significantly faster inside WSL2.

From here, follow the standard deployment guide (`docs/ops/deployment.md`) exactly — all commands are run from the WSL2 Ubuntu terminal.

---

## Step 6 — Configure TLS (Certbot inside WSL2)

```bash
# Inside WSL2 terminal
sudo apt install -y certbot

# Obtain a certificate (stop Nginx first if it is running)
docker compose -f /opt/sidhkofed/docker-compose.prod.yml stop nginx

sudo certbot certonly --standalone \
  --preferred-challenges http \
  -d yourdomain.com

# Copy certificates to the Nginx ssl directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/sidhkofed/nginx/ssl/fullchain.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem  /opt/sidhkofed/nginx/ssl/privkey.pem
sudo chmod 644 /opt/sidhkofed/nginx/ssl/*.pem
```

Auto-renewal hook (copies certs and reloads Nginx):

```bash
sudo tee /etc/letsencrypt/renewal-hooks/deploy/sidhkofed.sh <<'EOF'
#!/bin/bash
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/sidhkofed/nginx/ssl/fullchain.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem   /opt/sidhkofed/nginx/ssl/privkey.pem
docker exec sidhkofed-nginx nginx -s reload
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/sidhkofed.sh
```

Add to crontab (inside WSL2):

```bash
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet") | crontab -
```

---

## Step 7 — Automated backup (cron inside WSL2)

```bash
# Open crontab inside WSL2 Ubuntu
crontab -e

# Add:
0 2 * * * /opt/sidhkofed/scripts/backup.sh >> /var/log/sidhkofed-backup.log 2>&1
0 6 * * * /opt/sidhkofed/scripts/backup.sh --verify >> /var/log/sidhkofed-backup.log 2>&1
```

This is identical to the Linux guide — cron runs normally inside WSL2.

---

## Editing files from Windows (without entering WSL2)

The WSL2 filesystem is accessible from Windows Explorer and VS Code:

| Tool | How to access WSL2 files |
|------|--------------------------|
| Windows Explorer | `\\wsl$\Ubuntu-22.04\opt\sidhkofed\` |
| VS Code | `Ctrl+Shift+P` → "Remote-WSL: Open Folder in WSL" |
| PowerShell | `wsl cat /opt/sidhkofed/.env.prod` |

To edit `.env.prod` from VS Code on Windows: Open VS Code, install the "Remote - WSL" extension, then `Ctrl+Shift+P` → "Remote-WSL: Open Folder in WSL" → navigate to `/opt/sidhkofed/`.

---

## Checking if WSL2 and Docker are running

From PowerShell on Windows:

```powershell
# List running WSL2 instances
wsl --list --running

# Check Docker is up inside WSL2
wsl -d Ubuntu-22.04 -e docker ps

# Check service health
wsl -d Ubuntu-22.04 -e bash -c 'curl -sf http://localhost/health | python3 -m json.tool'
```

---

## PowerShell backup/restore scripts (alternative to WSL2 bash)

If you prefer to run backups and restores from PowerShell without entering the WSL2 terminal, PowerShell equivalents are available:

- `scripts\backup.ps1` — equivalent of `scripts/backup.sh`
- `scripts\restore.ps1` — equivalent of `scripts/restore.sh`

Run from PowerShell:

```powershell
# Backup database + media
.\scripts\backup.ps1

# Database only
.\scripts\backup.ps1 -DbOnly

# Verify the most recent backup
.\scripts\backup.ps1 -Verify

# Restore from latest
.\scripts\restore.ps1 -Latest
```

The PowerShell scripts use the same Docker commands under the hood and produce the same output files and symlinks.

---

## Troubleshooting Windows-specific issues

### WSL2 won't start
```powershell
# Check Windows features are enabled
Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform
Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux

# Reset WSL
wsl --shutdown
wsl --update
wsl -d Ubuntu-22.04
```

### Ports 80/443 not reachable from outside
```powershell
# Check Windows Firewall rules
Get-NetFirewallRule -DisplayName "SIDHKOFED*"

# Check WSL2 port proxy
netsh interface portproxy show all

# Manually add port proxy if missing (WSL2 usually handles this automatically)
$wslIp = (wsl hostname -I).Trim().Split(' ')[0]
netsh interface portproxy add v4tov4 listenport=80  connectaddress=$wslIp connectport=80
netsh interface portproxy add v4tov4 listenport=443 connectaddress=$wslIp connectport=443
```

> **Note on WSL2 port binding:** WSL2 automatically proxies ports bound by processes inside WSL2 to the Windows host. If the Nginx container binds to port 80 inside WSL2, Windows forwards inbound port 80 traffic to it. If this is not working, the manual port proxy commands above force it.

### Docker not starting after Windows reboot
Confirm the Task Scheduler task created in Step 3 ran:
```powershell
Get-ScheduledTaskInfo -TaskName "SIDHKOFED-WSL2-Start"
```
If the last run result is not `0`, run it manually: `Start-ScheduledTask -TaskName "SIDHKOFED-WSL2-Start"`, then check the error.

### High memory usage by WSL2
WSL2 can consume significant memory. Limit it by creating `%USERPROFILE%\.wslconfig` on the Windows host:
```ini
[wsl2]
memory=4GB
processors=2
swap=2GB
```
Then `wsl --shutdown` and restart.
