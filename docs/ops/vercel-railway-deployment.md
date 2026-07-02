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
Cloudflare R2, Backblaze B2). The app validates the `S3_*` variables below are
present at boot when `STORAGE_PROVIDER=s3` (see
[src/config/env.ts:159-170](../../src/config/env.ts)).

### Example: Backblaze B2

```
STORAGE_PROVIDER=s3
S3_ENDPOINT=https://s3.<region>.backblazeb2.com
S3_REGION=<region>                    # e.g. us-west-004 — the 2nd segment of your endpoint
S3_BUCKET=<your-bucket-name>
S3_ACCESS_KEY_ID=<applicationKeyId>
S3_SECRET_ACCESS_KEY=<applicationKey>
S3_FORCE_PATH_STYLE=true
SIGNED_URL_TTL_SECONDS=600
STORAGE_PUBLIC_BASE_URL=https://s3.<region>.backblazeb2.com/<your-bucket-name>
```

- **Endpoint / region**: shown on the bucket's page in the B2 dashboard as
  `s3.<region>.backblazeb2.com` (e.g. `s3.us-west-004.backblazeb2.com` →
  region `us-west-004`). A B2 account is pinned to a single region.
- **Keys**: create an Application Key scoped to just this bucket (B2 dashboard
  → App Keys → Add a New Application Key) rather than using the master key.
  `keyID` → `S3_ACCESS_KEY_ID`, `applicationKey` → `S3_SECRET_ACCESS_KEY` — B2
  shows the secret once, at creation time, so capture it immediately.
- **Path style**: B2 supports both path-style and virtual-hosted-style
  addressing, so the repo's default of `true` works unchanged.
- **Bucket visibility**: keep it private. The S3 driver
  ([src/services/storage/s3.storage.ts:123-132](../../src/services/storage/s3.storage.ts))
  always delivers via time-limited presigned GET URLs built from
  `S3_ENDPOINT` + credentials — it never reads `STORAGE_PUBLIC_BASE_URL`.
  That variable is only consumed by the local-disk driver, but Zod still
  requires it to be a well-formed URL at boot regardless of provider, so the
  bucket base URL above is just a placeholder to satisfy validation.
- **Signing**: B2's S3-compatible API only supports SigV4, which
  `@aws-sdk/client-s3` already uses by default — no extra config needed.

---

## 4. What stays the same

- Local development is unaffected — `npm run db:up` / `docker-compose.yml`
  still bring up Postgres+Redis on the host as before.
- `docker-compose.prod.yml` remains a valid self-hosted alternative if you ever
  need to move off Vercel/Railway; nothing in this guide changes it.
