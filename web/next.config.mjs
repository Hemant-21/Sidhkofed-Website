/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The public website renders server-side (SSR/ISR) and also makes client-side
  // requests for filters/pagination. Browser requests go to `/api/v1/*` and are
  // proxied same-origin to the Express backend so they are never blocked by the
  // backend CORS allow-list. Server Components fetch the backend directly via an
  // absolute origin (see src/lib/api/server.ts). In production the reverse proxy
  // performs the same /api rewrite.
  async rewrites() {
    const backend = process.env.BACKEND_ORIGIN || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
    ];
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
