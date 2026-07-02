/**
 * Centralized, typed access to public runtime configuration. No other file reads
 * `process.env` directly (mirrors the backend foundation rule, doc 05). Only
 * NEXT_PUBLIC_* values exist in the browser; the frontend holds no secrets.
 */

function readPublic(key: string, fallback: string): string {
  const value = process.env[key];
  return value && value.length > 0 ? value : fallback;
}

export const env = {
  /** API base path as seen by the browser. Immutable backend contract: /api/v1. */
  apiBaseUrl: readPublic('NEXT_PUBLIC_API_BASE_URL', '/api/v1'),
  /** Default UI language. English primary, Hindi optional (codex §10). */
  defaultLanguage: readPublic('NEXT_PUBLIC_DEFAULT_LANGUAGE', 'en') as 'en' | 'hi',
} as const;

export type AppEnv = typeof env;
