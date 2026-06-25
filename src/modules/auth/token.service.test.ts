/**
 * Unit tests — token service. Redis is mocked with an in-memory store so rotation,
 * reuse detection, and revocation are exercised without infrastructure.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { store } = vi.hoisted(() => ({ store: new Map<string, string>() }));

vi.mock('@/services/redis', () => ({
  redis: {
    async set(key: string, value: string) {
      store.set(key, value);
      return 'OK';
    },
    async get(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    async del(...keys: string[]) {
      let n = 0;
      for (const k of keys) if (store.delete(k)) n++;
      return n;
    },
    async scan(_cursor: string, _match: string, pattern: string) {
      const prefix = pattern.replace(/\*$/, '');
      const keys = [...store.keys()].filter((k) => k.startsWith(prefix));
      return ['0', keys] as [string, string[]];
    },
  },
}));

import { tokenService } from './token.service';

const USER = '11111111-1111-1111-1111-111111111111';

beforeEach(() => store.clear());

describe('token.service', () => {
  it('issues an access token that verifies back to the user and session', async () => {
    const tokens = await tokenService.issueTokens(USER);
    const claims = tokenService.verifyAccessToken(tokens.accessToken);
    expect(claims.sub).toBe(USER);
    expect(claims.sid).toBe(tokens.sessionId);
    expect(claims.type).toBe('access');
    expect(tokens.expiresIn).toBe(900);
  });

  it('rejects a tampered/garbage access token', () => {
    expect(() => tokenService.verifyAccessToken('not-a-jwt')).toThrow();
  });

  it('accepts a current refresh token and rotates it on refresh', async () => {
    const first = await tokenService.issueTokens(USER);
    const rotated = await tokenService.rotateRefreshToken(first.refreshToken);
    expect(rotated.userId).toBe(USER);
    expect(rotated.sessionId).toBe(first.sessionId);
    expect(rotated.refreshToken).not.toBe(first.refreshToken);
    // The new refresh token is valid…
    await expect(tokenService.verifyRefreshSession(rotated.refreshToken)).resolves.toMatchObject({
      sub: USER,
    });
  });

  it('detects refresh-token reuse and revokes the session', async () => {
    const first = await tokenService.issueTokens(USER);
    await tokenService.rotateRefreshToken(first.refreshToken);
    // Replaying the now-superseded token is rejected AND kills the session.
    await expect(tokenService.rotateRefreshToken(first.refreshToken)).rejects.toThrow();
    // After reuse, even the rotated token is dead (session revoked).
    const stillThere = [...store.keys()].length;
    expect(stillThere).toBe(0);
  });

  it('revokes a single session on logout (idempotent for unknown tokens)', async () => {
    const tokens = await tokenService.issueTokens(USER);
    const revokedUser = await tokenService.revokeSession(tokens.refreshToken);
    expect(revokedUser).toBe(USER);
    await expect(tokenService.verifyRefreshSession(tokens.refreshToken)).rejects.toThrow();
    // Idempotent: undefined / invalid tokens are a no-op.
    await expect(tokenService.revokeSession(undefined)).resolves.toBeNull();
    await expect(tokenService.revokeSession('garbage')).resolves.toBeNull();
  });

  it('revokes all sessions for a user', async () => {
    await tokenService.issueTokens(USER);
    await tokenService.issueTokens(USER);
    expect([...store.keys()].length).toBe(2);
    const removed = await tokenService.revokeAllSessions(USER);
    expect(removed).toBe(2);
    expect([...store.keys()].length).toBe(0);
  });
});
