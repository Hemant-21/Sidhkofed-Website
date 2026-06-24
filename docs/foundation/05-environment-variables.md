# 5. Environment Variables

> The machine-usable template is [`../../.env.example`](../../.env.example). This
> document explains the contract: what each group is for, what is required, and the
> rules around it. `src/config` loads and **validates** these once at boot and fails
> fast on a missing/invalid required value — no other file reads `process.env`.

## Required vs optional

**Required to boot (all environments):** `NODE_ENV`, `DATABASE_URL`, `REDIS_URL`,
`JWT_SECRET`, `STORAGE_PROVIDER`, `PUBLIC_WEBSITE_URL`.
**Conditionally required:** S3 keys when `STORAGE_PROVIDER=s3`; SMTP + recipient
when `EMAIL_ENABLED=true`; `CAPTCHA_SECRET` when `CAPTCHA_PROVIDER≠none`.
Everything else has a safe default in `.env.example`.

## Variable groups

| Group | Keys (prefix) | Maps to / enforces |
|---|---|---|
| **App** | `NODE_ENV`, `APP_PORT`, `API_BASE_PATH`, `PUBLIC_WEBSITE_URL`, `LOG_LEVEL` | immutable `/api/v1` base; CORS/SEO links |
| **Database** | `DATABASE_URL`, `DATABASE_REPLICA_URL`, `DB_POOL_MAX` | Prisma datasource; optional read replica for public reads; PgBouncer pooling |
| **Redis** | `REDIS_URL`, `CACHE_TTL_SECONDS`, `QUEUE_PREFIX` | master/home cache + ETag, BullMQ job queue |
| **Auth/JWT** | `JWT_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `REFRESH_COOKIE_*`, `PASSWORD_HASH_ROUNDS` | short-lived access token, rotating refresh in Secure/HttpOnly/SameSite cookie (API spec §1.2) |
| **Storage** | `STORAGE_PROVIDER`, `STORAGE_LOCAL_ROOT`, `STORAGE_PUBLIC_BASE_URL`, `S3_*`, `SIGNED_URL_TTL_SECONDS` | private object storage; DB stores metadata only; signed delivery URLs |
| **Upload limits** | `UPLOAD_MAX_*_MB`, `UPLOAD_BULK_MAX_FILES`, `UPLOAD_ALLOWED_*_TYPES`, `MALWARE_SCAN_ENABLED` | server-side MIME/size validation; quarantine before public |
| **Email** | `EMAIL_ENABLED`, `EMAIL_FROM`, `EMAIL_ENQUIRY_RECIPIENT`, `EMAIL_SUBJECT_PREFIX`, `SMTP_*` | single configurable enquiry recipient; **no** acknowledgement email to enquirer |
| **Abuse protection** | `CAPTCHA_*`, `ENQUIRY_RATELIMIT_*`, `IP_HASH_SALT` | CAPTCHA + rate limit + privacy-safe `source_ip_hash` |
| **Localization** | `DEFAULT_LANGUAGE`, `SUPPORTED_LANGUAGES`, `TRANSLATION_FALLBACK_ENABLED` | English primary, Hindi optional, labeled fallback only |

## Relationship to the `settings` table (important)

Some values exist in **both** env and the DB `settings` table, by design:

- **`.env` = infrastructure & secrets** (DB URL, JWT secret, SMTP credentials,
  storage keys, salts). Set per environment, not editable from the CMS.
- **`settings` table = editorial/operational config** (office name/address/phone,
  social links, footer text, enquiry-recipient *display*, upload restrictions shown
  to editors, translation fallback toggle). Editable by Super Admin via
  `GET|PUT /admin/settings/{key}`.

Where they overlap (e.g. enquiry recipient, upload limits, translation fallback),
**the `settings` table is the runtime source of truth and the env value is the
bootstrap default/secret backing.** This keeps secrets out of the database and
editorial config out of redeploys.

## Rules

1. `.env` is **never committed**. Confirm `.env` is in `.gitignore` before first run;
   only `.env.example` is tracked.
2. Production overrides `REFRESH_COOKIE_SECURE=true`, `MALWARE_SCAN_ENABLED=true`,
   a real `CAPTCHA_PROVIDER`, a strong `JWT_SECRET`/`IP_HASH_SALT` (≥32 random chars).
3. Adding a new variable means: add to `.env.example` (with a safe placeholder),
   add to the typed `src/config` validator, and document it here.
4. No feature reads `process.env` directly — only `src/config` does.
