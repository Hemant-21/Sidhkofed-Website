/**
 * Environment loading + validation (the ONLY place process.env is read).
 *
 * Parses and validates every variable from `.env` once at boot using Zod and fails
 * fast on a missing/invalid required value (docs/foundation/05-environment-variables.md).
 * Conditionally-required groups (S3, SMTP, CAPTCHA) are enforced with refinements.
 */
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

/** Coerce common truthy/falsy string forms to a boolean (absent/empty → default). */
const boolish = (def: boolean) =>
  z
    .preprocess(
      (v) => (v === undefined || v === '' ? undefined : v),
      z.enum(['true', 'false', '1', '0']).optional(),
    )
    .transform((v) => (v === undefined ? def : v === 'true' || v === '1'));

const csv = (def: string) =>
  z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== '' ? v : def))
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );

const intWithDefault = (def: number, min = 0) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : Number(v)))
    .pipe(z.number().int().min(min));

const envSchema = z
  .object({
    // ── App ──────────────────────────────────────────────────────────────────
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_NAME: z.string().min(1).default('sidhkofed-cms'),
    APP_PORT: intWithDefault(4000, 1),
    API_BASE_PATH: z.string().startsWith('/').default('/api/v1'),
    PUBLIC_WEBSITE_URL: z.string().url(),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    // ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    DATABASE_REPLICA_URL: z.string().optional().transform((v) => (v && v.trim() !== '' ? v : undefined)),
    DB_POOL_MAX: intWithDefault(10, 1),

    // ── Redis ────────────────────────────────────────────────────────────────
    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
    CACHE_TTL_SECONDS: intWithDefault(300, 0),
    QUEUE_PREFIX: z.string().min(1).default('sidhkofed'),

    // ── Auth / JWT ───────────────────────────────────────────────────────────
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_ACCESS_TTL: intWithDefault(900, 1),
    JWT_REFRESH_TTL: intWithDefault(2592000, 1),
    JWT_ISSUER: z.string().min(1).default('sidhkofed-cms'),
    REFRESH_COOKIE_NAME: z.string().min(1).default('sidhkofed_rt'),
    REFRESH_COOKIE_SECURE: boolish(false),
    REFRESH_COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    PASSWORD_HASH_ROUNDS: intWithDefault(12, 4),

    // ── Seed (default Super Admin; only the seeder reads these, not the app) ────
    SEED_SUPERADMIN_EMAIL: z.string().optional().transform((v) => (v && v.trim() !== '' ? v.trim() : undefined)),
    SEED_SUPERADMIN_PASSWORD: z.string().optional().transform((v) => (v && v.trim() !== '' ? v : undefined)),
    SEED_SUPERADMIN_NAME: z.string().optional().transform((v) => (v && v.trim() !== '' ? v.trim() : undefined)),

    // ── Storage ──────────────────────────────────────────────────────────────
    // Only implemented providers are accepted; an unimplemented value (e.g. `gcs`) must
    // fail config validation rather than crash at first use (pre-Phase-5 audit, Issue 7).
    STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
    STORAGE_LOCAL_ROOT: z.string().default('./storage'),
    STORAGE_PUBLIC_BASE_URL: z.string().url(),
    S3_ENDPOINT: z.string().optional().transform((v) => (v && v.trim() !== '' ? v : undefined)),
    S3_REGION: z.string().optional().transform((v) => (v && v.trim() !== '' ? v : undefined)),
    S3_BUCKET: z.string().optional().transform((v) => (v && v.trim() !== '' ? v : undefined)),
    S3_ACCESS_KEY_ID: z.string().optional().transform((v) => (v && v.trim() !== '' ? v : undefined)),
    S3_SECRET_ACCESS_KEY: z.string().optional().transform((v) => (v && v.trim() !== '' ? v : undefined)),
    S3_FORCE_PATH_STYLE: boolish(true),
    SIGNED_URL_TTL_SECONDS: intWithDefault(600, 1),

    // ── Upload limits ────────────────────────────────────────────────────────
    UPLOAD_MAX_IMAGE_MB: intWithDefault(10, 1),
    UPLOAD_MAX_DOCUMENT_MB: intWithDefault(25, 1),
    UPLOAD_MAX_DATASET_MB: intWithDefault(15, 1),
    UPLOAD_BULK_MAX_FILES: intWithDefault(50, 1),
    // Aggregate cap for a whole multipart upload request (remediation Issue 2). Bounds total
    // memory a single request can buffer, independent of the per-file and file-count limits.
    UPLOAD_MAX_REQUEST_MB: intWithDefault(60, 1),
    // SVG intentionally excluded (Issue 3): XML-based images can carry scripts.
    UPLOAD_ALLOWED_IMAGE_TYPES: csv('image/jpeg,image/png,image/webp,image/gif'),
    UPLOAD_ALLOWED_DOCUMENT_TYPES: csv(
      'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ),
    UPLOAD_ALLOWED_DATASET_TYPES: csv(
      'text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ),
    MALWARE_SCAN_ENABLED: boolish(false),

    // ── Email ────────────────────────────────────────────────────────────────
    EMAIL_ENABLED: boolish(false),
    EMAIL_FROM: z.string().default('SIDHKOFED CMS <no-reply@sidhkofed.example>'),
    EMAIL_ENQUIRY_RECIPIENT: z.string().optional().transform((v) => (v && v.trim() !== '' ? v : undefined)),
    EMAIL_SUBJECT_PREFIX: z.string().default('[SIDHKOFED Enquiry]'),
    SMTP_HOST: z.string().optional().transform((v) => (v && v.trim() !== '' ? v : undefined)),
    SMTP_PORT: intWithDefault(587, 1),
    SMTP_SECURE: boolish(false),
    SMTP_USER: z.string().optional().transform((v) => (v && v.trim() !== '' ? v : undefined)),
    SMTP_PASSWORD: z.string().optional().transform((v) => (v && v.trim() !== '' ? v : undefined)),

    // ── Abuse protection ─────────────────────────────────────────────────────
    CAPTCHA_PROVIDER: z.enum(['none', 'recaptcha', 'turnstile']).default('none'),
    CAPTCHA_SECRET: z.string().optional().transform((v) => (v && v.trim() !== '' ? v : undefined)),
    ENQUIRY_RATELIMIT_PER_IP_HOUR: intWithDefault(5, 0),
    ENQUIRY_RATELIMIT_PER_CONTACT_HOUR: intWithDefault(3, 0),
    IP_HASH_SALT: z.string().min(8, 'IP_HASH_SALT should be a random salt'),

    // ── Rate limiting (Redis-backed; pre-Phase-5 audit Issue 5) ───────────────
    RATE_LIMIT_ENABLED: boolish(true),
    RATE_LIMIT_LOGIN_MAX: intWithDefault(5, 1),
    RATE_LIMIT_LOGIN_WINDOW_SEC: intWithDefault(900, 1),
    RATE_LIMIT_REFRESH_MAX: intWithDefault(30, 1),
    RATE_LIMIT_REFRESH_WINDOW_SEC: intWithDefault(900, 1),
    RATE_LIMIT_UPLOAD_MAX: intWithDefault(60, 1),
    RATE_LIMIT_UPLOAD_WINDOW_SEC: intWithDefault(900, 1),

    // ── Localization ─────────────────────────────────────────────────────────
    DEFAULT_LANGUAGE: z.enum(['en', 'hi']).default('en'),
    SUPPORTED_LANGUAGES: csv('en,hi'),
    TRANSLATION_FALLBACK_ENABLED: boolish(false),

    // ── Background scheduler (Phase 14) ───────────────────────────────────────
    // Recurring maintenance jobs (scheduled publishing, highlight expiry, event-status
    // recompute, dashboard cache refresh). The scheduler runs inside the worker boot
    // step; disable it for an API-only process or in tests. Cron strings are standard
    // 5-field expressions (BullMQ repeatable jobs). Batch size bounds rows processed per
    // tick; lock TTL guards against overlapping runs across processes.
    SCHEDULER_ENABLED: boolish(true),
    SCHEDULER_TIMEZONE: z.string().min(1).default('Asia/Kolkata'),
    // Default cadence: publishing/highlight every 5 min; status every 15 min; dashboard hourly.
    SCHEDULER_PUBLISHING_CRON: z.string().min(1).default('*/5 * * * *'),
    SCHEDULER_HIGHLIGHT_CRON: z.string().min(1).default('*/5 * * * *'),
    SCHEDULER_EVENT_STATUS_CRON: z.string().min(1).default('*/15 * * * *'),
    SCHEDULER_DASHBOARD_REFRESH_CRON: z.string().min(1).default('0 * * * *'),
    SCHEDULER_BATCH_SIZE: intWithDefault(100, 1),
    SCHEDULER_JOB_ATTEMPTS: intWithDefault(3, 1),
    SCHEDULER_JOB_BACKOFF_MS: intWithDefault(5000, 0),
    SCHEDULER_LOCK_TTL_SECONDS: intWithDefault(600, 5),
  })
  // S3 keys required when storage provider is s3.
  .superRefine((env, ctx) => {
    if (env.STORAGE_PROVIDER === 's3') {
      for (const key of ['S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when STORAGE_PROVIDER=s3`,
          });
        }
      }
    }
    // SMTP + recipient required when email is enabled.
    if (env.EMAIL_ENABLED) {
      if (!env.SMTP_HOST) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['SMTP_HOST'], message: 'SMTP_HOST is required when EMAIL_ENABLED=true' });
      }
      if (!env.EMAIL_ENQUIRY_RECIPIENT) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['EMAIL_ENQUIRY_RECIPIENT'], message: 'EMAIL_ENQUIRY_RECIPIENT is required when EMAIL_ENABLED=true' });
      }
    }
    // CAPTCHA secret required when a provider is configured.
    if (env.CAPTCHA_PROVIDER !== 'none' && !env.CAPTCHA_SECRET) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['CAPTCHA_SECRET'], message: 'CAPTCHA_SECRET is required when CAPTCHA_PROVIDER is not "none"' });
    }
  });

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
  // Intentional stderr write: config fails before the logger exists.
  // eslint-disable-next-line no-console
  console.error(`\nInvalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

export const env: Env = parsed.data;
