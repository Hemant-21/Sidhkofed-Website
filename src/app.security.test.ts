/**
 * Security-header regression test (Phase 17.1). Asserts the hardened header set is
 * applied to API responses. Hits the version descriptor (`/api/v1/`) so no database
 * or Redis round-trip is needed.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '@/app';

const app = createApp();

describe('security headers', () => {
  it('applies the hardened header set to API responses', async () => {
    const res = await request(app).get('/api/v1/');
    expect(res.status).toBe(200);

    // Strict API CSP (JSON-only surface).
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");

    // HSTS (2 years, subdomains, preload).
    expect(res.headers['strict-transport-security']).toContain('max-age=63072000');
    expect(res.headers['strict-transport-security']).toContain('includeSubDomains');

    // Clickjacking + MIME-sniffing + referrer + permissions.
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['permissions-policy']).toContain('geolocation=()');

    // Server fingerprint suppressed.
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
