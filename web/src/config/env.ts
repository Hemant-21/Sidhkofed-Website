/**
 * Centralized, typed access to public runtime configuration. No other file reads
 * `process.env` directly (mirrors the backend foundation rule, doc 05). Only
 * NEXT_PUBLIC_* values exist in the browser; the public site holds no secrets.
 *
 * `serverApiBaseUrl` is for Server Components only (absolute backend origin, no
 * CORS). `apiBaseUrl` is the browser-facing path proxied same-origin by Next.
 */

function read(key: string, fallback: string): string {
  const value = process.env[key];
  return value && value.length > 0 ? value : fallback;
}

const backendOrigin = read('BACKEND_ORIGIN', 'http://localhost:4000');
const apiBaseUrl = read('NEXT_PUBLIC_API_BASE_URL', '/api/v1');

export const env = {
  /** Browser-facing API base path (proxied same-origin). Immutable contract: /api/v1. */
  apiBaseUrl,
  /** Absolute backend API base for Server Component fetches (no CORS). */
  serverApiBaseUrl: `${backendOrigin}${apiBaseUrl}`,
  /** Public canonical site URL (SEO canonical/OG, sitemap, robots). */
  siteUrl: read('NEXT_PUBLIC_SITE_URL', 'http://localhost:3002'),
  /** Default UI language. English primary, Hindi optional (codex §10). */
  defaultLanguage: read('NEXT_PUBLIC_DEFAULT_LANGUAGE', 'en') as 'en' | 'hi',
} as const;

export type AppEnv = typeof env;
