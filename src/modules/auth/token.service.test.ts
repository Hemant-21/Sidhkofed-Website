/**
 * Unit tests - token service. Prisma is mocked with an in-memory store so rotation,
 * reuse detection, and revocation are exercised without infrastructure.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

interface SessionRow {
  sessionId: string;
  userId: string;
  currentJti: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

const { store } = vi.hoisted(() => ({ store: new Map<string, SessionRow>() }));

vi.mock('@/db/prisma', () => ({
  prisma: {
    authRefreshSession: {
      async upsert(args: {
        where: { sessionId: string };
        create: SessionRow;
        update: Partial<SessionRow>;
      }) {
        const existing = store.get(args.where.sessionId);
        if (existing) {
          store.set(args.where.sessionId, { ...existing, ...args.update });
          return store.get(args.where.sessionId)!;
        }
        store.set(args.where.sessionId, { ...args.create, revokedAt: args.create.revokedAt ?? null });
        return store.get(args.where.sessionId)!;
      },
      async findUnique(args: { where: { sessionId: string } }) {
        return store.get(args.where.sessionId) ?? null;
      },
      async update(args: { where: { sessionId: string }; data: Partial<SessionRow> }) {
        const existing = store.get(args.where.sessionId);
        if (!existing) throw new Error('not found');
        store.set(args.where.sessionId, { ...existing, ...args.data });
        return store.get(args.where.sessionId)!;
      },
      async updateMany(args: {
        where: { sessionId?: string; userId?: string; revokedAt?: null };
        data: Partial<SessionRow>;
      }) {
        let count = 0;
        for (const [key, row] of store) {
          if (args.where.sessionId && row.sessionId !== args.where.sessionId) continue;
          if (args.where.userId && row.userId !== args.where.userId) continue;
          if ('revokedAt' in args.where && row.revokedAt !== args.where.revokedAt) continue;
          store.set(key, { ...row, ...args.data });
          count += 1;
        }
        return { count };
      },
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
    await expect(tokenService.verifyRefreshSession(rotated.refreshToken)).resolves.toMatchObject({
      sub: USER,
    });
  });

  it('detects refresh-token reuse and revokes the session', async () => {
    const first = await tokenService.issueTokens(USER);
    await tokenService.rotateRefreshToken(first.refreshToken);
    await expect(tokenService.rotateRefreshToken(first.refreshToken)).rejects.toThrow();
    expect([...store.values()].filter((s) => !s.revokedAt)).toHaveLength(0);
  });

  it('revokes a single session on logout (idempotent for unknown tokens)', async () => {
    const tokens = await tokenService.issueTokens(USER);
    const revokedUser = await tokenService.revokeSession(tokens.refreshToken);
    expect(revokedUser).toBe(USER);
    await expect(tokenService.verifyRefreshSession(tokens.refreshToken)).rejects.toThrow();
    await expect(tokenService.revokeSession(undefined)).resolves.toBeNull();
    await expect(tokenService.revokeSession('garbage')).resolves.toBeNull();
  });

  it('revokes all sessions for a user', async () => {
    await tokenService.issueTokens(USER);
    await tokenService.issueTokens(USER);
    expect([...store.values()].filter((s) => !s.revokedAt)).toHaveLength(2);
    const removed = await tokenService.revokeAllSessions(USER);
    expect(removed).toBe(2);
    expect([...store.values()].filter((s) => !s.revokedAt)).toHaveLength(0);
  });
});
