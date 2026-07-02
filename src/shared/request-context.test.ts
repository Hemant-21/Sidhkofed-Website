/**
 * Unit tests — auditContext() helper.
 * Verifies the privacy-safe IP hash, user-agent forwarding, and user-id extraction.
 * Pure function; only crypto and abuseConfig.ipHashSalt are needed.
 */
import { describe, it, expect, vi } from 'vitest';
import type { Request } from 'express';

vi.mock('@/config', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return { ...actual, abuseConfig: { ipHashSalt: 'test-salt', captchaProvider: 'none', captchaSecret: '', enquiryRateLimitPerIpHour: 5, enquiryRateLimitPerContactHour: 3 } };
});

import { auditContext } from './request-context';

function fakeReq(over: Partial<Request> = {}): Request {
  return {
    ip: '127.0.0.1',
    headers: {},
    user: undefined,
    authz: undefined,
    ...over,
  } as unknown as Request;
}

describe('auditContext', () => {
  it('hashes the IP address (never returns the raw IP)', () => {
    const ctx = auditContext(fakeReq({ ip: '1.2.3.4' }));
    expect(ctx.ipHash).not.toBe('1.2.3.4');
    expect(typeof ctx.ipHash).toBe('string');
    expect(ctx.ipHash!.length).toBe(64); // sha256 hex = 64 chars
  });

  it('produces a deterministic hash for the same IP + salt', () => {
    const ctx1 = auditContext(fakeReq({ ip: '10.0.0.1' }));
    const ctx2 = auditContext(fakeReq({ ip: '10.0.0.1' }));
    expect(ctx1.ipHash).toBe(ctx2.ipHash);
  });

  it('produces different hashes for different IPs', () => {
    const ctx1 = auditContext(fakeReq({ ip: '10.0.0.1' }));
    const ctx2 = auditContext(fakeReq({ ip: '10.0.0.2' }));
    expect(ctx1.ipHash).not.toBe(ctx2.ipHash);
  });

  it('falls back to "unknown" when req.ip is absent', () => {
    const ctx = auditContext(fakeReq({ ip: undefined }));
    // The hash of "unknown:test-salt" is a valid 64-char hex string.
    expect(typeof ctx.ipHash).toBe('string');
    expect(ctx.ipHash!.length).toBe(64);
  });

  it('extracts userId from req.user.id', () => {
    const ctx = auditContext(fakeReq({ user: { id: 'user-uuid-1' } as Request['user'] }));
    expect(ctx.userId).toBe('user-uuid-1');
  });

  it('sets userId to null when user is not authenticated', () => {
    const ctx = auditContext(fakeReq({ user: undefined }));
    expect(ctx.userId).toBeNull();
  });

  it('forwards the User-Agent header', () => {
    const ctx = auditContext(fakeReq({ headers: { 'user-agent': 'Mozilla/5.0' } }));
    expect(ctx.userAgent).toBe('Mozilla/5.0');
  });

  it('sets userAgent to null when header is absent', () => {
    const ctx = auditContext(fakeReq({ headers: {} }));
    expect(ctx.userAgent).toBeNull();
  });

  it('forwards req.authz to ctx.authz', () => {
    const authz = { roles: ['publisher'], permissions: [], isSuperAdmin: false };
    const ctx = auditContext(fakeReq({ authz } as unknown as Request));
    expect(ctx.authz).toBe(authz);
  });
});
