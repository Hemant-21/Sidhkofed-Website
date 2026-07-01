# SIDHKOFED CMS — Vercel + Railway Deployment Guide

Alternative to the self-hosted Docker/Nginx stack in [deployment.md](deployment.md). Maps the
three application processes onto managed platforms instead of a single VM:

```
Vercel                              Railway
┌─────────────────────┐             ┌──────────────────────────────┐
│ web    (Next.js)    │  BACKEND_   │ api (Express, this repo root)│
│ *.vercel.app         │  ORIGIN ──▶│  - REST API                  │
│                      │             │  - BullMQ scheduler (in-proc)│
├─────────────────────┤             │                              │
│ admin  (Next.js)    │  BACKEND_   │  ├── Postgres (managed)      │
│ *.vercel.app         │  ORIGIN ──▶│  └── Redis (managed)         │
└─────────────────────┘             └──────────────────────────────┘
```

`admin` and `web` never call the API cross-origin from the browser — both proxy
`/api/*` same-origin via `next.config.mjs` `rewrites()` to `BACKEND_ORIGIN`. That
proxy is why the refresh cookie stays same-site and why the API's CORS allow-list
(`PUBLIC_WEBSITE_URL`) rarely comes into play in this topology.

Not needed with this topology: [nginx/](../../nginx), TLS certs,
[docker-compose.prod.yml](../../docker-compose.prod.yml) — Vercel and Railway
terminate TLS and route traffic themselves.

---

## 1. Railway — API + Postgres + Redis

1. **New Project → Deploy from GitHub repo**, select this repo. Set the service's
   **root directory to `/`** (repo root) — it already has [railway.json](../../railway.json)
   pointing Railway at the root [Dockerfile](../../Dockerfile) (builds `dist/server.js`,
   exposes port 4000, healthcheck at `/live`).
2. **Add plugins**: `+ New` → **Database → PostgreSQL**, and again for **Redis**.
   Railway exposes each as reference variables you can interpolate into the API
   service's variables (`${{Postgres.DATABASE_URL}}`, `${{Redis.REDIS_URL}}`).
3. **Service variables** — set on the `api` service (see
   [.env.example](../../.env.example) for the full annotated list; only the
   deployment-relevant ones are called out here):

   | Variable | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
   | `REDIS_URL` | `${{Redis.REDIS_URL}}` |
   | `PUBLIC_WEBSITE_URL` | the `web` project's Vercel/custom domain, e.g. `https://sidhkofed.org` |
   | `JWT_SECRET` | `openssl rand -base64 48` |
   | `IP_HASH_SALT` | `openssl rand -base64 32` |
   | `REFRESH_COOKIE_SECURE` | `true` |
   | `STORAGE_PROVIDER` | `s3` (see §3 — Railway's filesystem is ephemeral per deploy) |
   | `STORAGE_PUBLIC_BASE_URL` | your bucket's public/CDN base URL |
   | `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | from your S3/R2 bucket |
   | `SCHEDULER_ENABLED` | `true` (safe with multiple replicas — the scheduler takes a Redis lock per tick) |

   Everything else in `.env.example` (email/SMTP, captcha, rate limits, upload
   limits) keeps its documented default unless you're enabling that feature.

4. **Networking**: Railway reads the exposed port from the Dockerfile (4000), no
   `PORT` env var needed. Generate a public domain under the service's
   **Settings → Networking**, or attach a custom domain.
5. **Run the first migration** (one-off, not on every boot — mirrors the
   `migrate` service in `docker-compose.prod.yml`):
   ```bash
   railway run --service api -- npx prisma migrate deploy
   ```
   Re-run this after any deploy that includes a new migration.

---

## 2. Vercel — `admin` and `web`

Each is a **separate Vercel project** pointed at the same GitHub repo with a
different **Root Directory** (Project Settings → General → Root Directory).
Vercel auto-detects Next.js 14 — no `vercel.json` needed.

### `web` project — Root Directory: `web`

| Variable | Value |
|---|---|
| `BACKEND_ORIGIN` | Railway API public domain, e.g. `https://sidhkofed-api.up.railway.app` |
| `NEXT_PUBLIC_SITE_URL` | this project's own domain, e.g. `https://sidhkofed.org` |
| `NEXT_PUBLIC_API_BASE_URL` | leave unset (defaults to `/api/v1`, the immutable contract) |
| `NEXT_PUBLIC_DEFAULT_LANGUAGE` | `en` (optional, defaults to `en`) |

### `admin` project — Root Directory: `admin`

| Variable | Value |
|---|---|
| `BACKEND_ORIGIN` | same Railway API public domain |
| `NEXT_PUBLIC_API_BASE_URL` | leave unset |
| `NEXT_PUBLIC_DEFAULT_LANGUAGE` | `en` (optional) |

Set both `Production` and `Preview` environments so PR previews still proxy to
the Railway API. `images.remotePatterns` in both `next.config.mjs` already
allow any `https` host, so Next/Image can optimize media served from your S3
bucket or from the API without extra config.

Once `web`'s final domain is live, update `PUBLIC_WEBSITE_URL` on the Railway
`api` service to match (used for CORS and for absolute links/SEO) and redeploy.

---

## 3. Object storage (required for production)

`STORAGE_PROVIDER=local` writes uploads to `./storage` on the API container's
disk (see [.env.example:64-66](../../.env.example)). Railway containers are
ephemeral and don't share disk across replicas or redeploys, so production
must use `STORAGE_PROVIDER=s3` against any S3-compatible bucket (AWS S3,
Cloudflare R2, Backblaze B2). Set the `S3_*` variables listed in §1 and point
`STORAGE_PUBLIC_BASE_URL` at the bucket's public/CDN URL — the app validates
these are present at boot when `STORAGE_PROVIDER=s3` (see
[src/config/env.ts:159-170](../../src/config/env.ts)).

---

## 4. What stays the same

- Local development is unaffected — `npm run db:up` / `docker-compose.yml`
  still bring up Postgres+Redis on the host as before.
- `docker-compose.prod.yml` remains a valid self-hosted alternative if you ever
  need to move off Vercel/Railway; nothing in this guide changes it.
