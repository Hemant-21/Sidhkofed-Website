/** @type {import('next').NextConfig} */
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
};

export default nextConfig;
