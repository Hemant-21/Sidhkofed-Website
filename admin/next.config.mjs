/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

/**
 * Content Security Policy (Phase 17.1 security remediation) for the admin CMS shell.
 *
 * Next.js App Router emits inline bootstrap scripts, so `script-src` keeps
 * `'unsafe-inline'`; `'unsafe-eval'` is dev-only (React Refresh). The admin renders
 * media previews (images) from the backend/object storage and talks to the backend
 * same-origin (`/api/v1/*` proxied), so `connect-src 'self'` and `img-src` allows
 * https/data/blob (plus http://localhost in dev). The admin is framed nowhere.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https:${isProd ? '' : ' http:'}`,
  "font-src 'self' data:",
  `connect-src 'self'${isProd ? '' : ' ws: http://localhost:*'}`,
  "frame-src 'self'",
  "media-src 'self' blob:",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The admin app is a SPA-style CMS shell that talks to the Express backend
  // (/api/v1/*). In dev we proxy /api to the backend so the browser keeps the
  // refresh cookie same-origin. In production this is handled by the reverse proxy.
  async rewrites() {
    const backend = process.env.BACKEND_ORIGIN || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
