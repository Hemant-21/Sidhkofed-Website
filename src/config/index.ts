/**
 * Typed configuration objects, derived once from the validated `env`.
 *
 * Every module imports from here (or a narrower slice) instead of touching
 * process.env. Grouping mirrors docs/foundation/05-environment-variables.md.
 */
import { env } from './env';

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const isDevelopment = env.NODE_ENV === 'development';

export const appConfig = {
  name: env.APP_NAME,
  env: env.NODE_ENV,
  port: env.APP_PORT,
  apiBasePath: env.API_BASE_PATH,
  publicWebsiteUrl: env.PUBLIC_WEBSITE_URL,
  logLevel: env.LOG_LEVEL,
} as const;

export const dbConfig = {
  url: env.DATABASE_URL,
  replicaUrl: env.DATABASE_REPLICA_URL,
  poolMax: env.DB_POOL_MAX,
} as const;

export const redisConfig = {
  url: env.REDIS_URL,
  cacheTtlSeconds: env.CACHE_TTL_SECONDS,
  queuePrefix: env.QUEUE_PREFIX,
} as const;

export const jwtConfig = {
  secret: env.JWT_SECRET,
  accessTtl: env.JWT_ACCESS_TTL,
  refreshTtl: env.JWT_REFRESH_TTL,
  issuer: env.JWT_ISSUER,
  refreshCookie: {
    name: env.REFRESH_COOKIE_NAME,
    secure: env.REFRESH_COOKIE_SECURE,
    sameSite: env.REFRESH_COOKIE_SAMESITE,
  },
  passwordHashRounds: env.PASSWORD_HASH_ROUNDS,
} as const;

export const storageConfig = {
  provider: env.STORAGE_PROVIDER,
  localRoot: env.STORAGE_LOCAL_ROOT,
  publicBaseUrl: env.STORAGE_PUBLIC_BASE_URL,
  signedUrlTtlSeconds: env.SIGNED_URL_TTL_SECONDS,
  s3: {
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    bucket: env.S3_BUCKET,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  },
} as const;

export const uploadConfig = {
  maxImageMb: env.UPLOAD_MAX_IMAGE_MB,
  maxDocumentMb: env.UPLOAD_MAX_DOCUMENT_MB,
  maxDatasetMb: env.UPLOAD_MAX_DATASET_MB,
  bulkMaxFiles: env.UPLOAD_BULK_MAX_FILES,
  allowedImageTypes: env.UPLOAD_ALLOWED_IMAGE_TYPES,
  allowedDocumentTypes: env.UPLOAD_ALLOWED_DOCUMENT_TYPES,
  allowedDatasetTypes: env.UPLOAD_ALLOWED_DATASET_TYPES,
  malwareScanEnabled: env.MALWARE_SCAN_ENABLED,
} as const;

export const emailConfig = {
  enabled: env.EMAIL_ENABLED,
  from: env.EMAIL_FROM,
  enquiryRecipient: env.EMAIL_ENQUIRY_RECIPIENT,
  subjectPrefix: env.EMAIL_SUBJECT_PREFIX,
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
  },
} as const;

export const abuseConfig = {
  captchaProvider: env.CAPTCHA_PROVIDER,
  captchaSecret: env.CAPTCHA_SECRET,
  enquiryRateLimitPerIpHour: env.ENQUIRY_RATELIMIT_PER_IP_HOUR,
  enquiryRateLimitPerContactHour: env.ENQUIRY_RATELIMIT_PER_CONTACT_HOUR,
  ipHashSalt: env.IP_HASH_SALT,
} as const;

export const localizationConfig = {
  defaultLanguage: env.DEFAULT_LANGUAGE,
  supportedLanguages: env.SUPPORTED_LANGUAGES,
  translationFallbackEnabled: env.TRANSLATION_FALLBACK_ENABLED,
} as const;

export const config = {
  app: appConfig,
  db: dbConfig,
  redis: redisConfig,
  jwt: jwtConfig,
  storage: storageConfig,
  upload: uploadConfig,
  email: emailConfig,
  abuse: abuseConfig,
  localization: localizationConfig,
} as const;

export type AppConfig = typeof config;
