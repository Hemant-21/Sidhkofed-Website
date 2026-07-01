/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

/**
 * Content Security Policy (Phase 17.1 security remediation).
 *
 * This site is statically generated / ISR (many routes use `revalidate`), so a
 * per-request nonce is not viable — nonces force fully dynamic rendering and would
 * break ISR. We therefore ship a static, build-time CSP. Next.js App Router emits
 * inline bootstrap scripts and the SEO layer emits inline JSON-LD, so `script-src`
 * keeps `'unsafe-inline'`; `'unsafe-eval'` is dev-only (React Refresh). Script
 * injection is still blocked by the DOMPurify sanitizer + JSON-LD escaping — the CSP
 * is defence-in-depth, not the primary XSS control.
 *
 * Fonts are self-hosted by `next/font/google` (no runtime gstatic), images come from
 * the backend/object storage over https (http://localhost only in dev), and browser
 * API calls are same-origin (`/api/v1/*` proxied), so `connect-src 'self'`.
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
  "frame-src 'self' https://www.youtube-nocookie.com",
  "media-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ');

/** Production-grade security headers applied to every response. */
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
  // Enable standalone output for Docker — produces a self-contained server
  // bundle under .next/standalone that does not require node_modules at runtime.
  output: 'standalone',
  // The public website renders server-side (SSR/ISR) and also makes client-side
  // requests for filters/pagination. Browser requests go to `/api/v1/*` and are
  // proxied same-origin to the Express backend so they are never blocked by the
  // backend CORS allow-list. Server Components fetch the backend directly via an
  // absolute origin (see src/lib/api/server.ts). In production the reverse proxy
  // performs the same /api rewrite.
  async redirects() {
    return [
      { source: '/dashboard/:path*', destination: '/impact/dashboard/:path*', permanent: false },
      { source: '/tenders/:path*', destination: '/notifications/tenders/:path*', permanent: false },
      { source: '/official-communications/:path*', destination: '/notifications/notices/:path*', permanent: false },
      { source: '/knowledge-centre/:path*', destination: '/publications/:path*', permanent: false },
      { source: '/memberships/:path*', destination: '/membership/:path*', permanent: false },
      { source: '/procurement-updates/:path*', destination: '/procurement/announcements/:path*', permanent: false },
    ];
  },
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
  images: {
    // Media is served from the backend / object storage via absolute URLs. Allow
    // remote optimization; tighten the host allow-list for production deployment.
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
