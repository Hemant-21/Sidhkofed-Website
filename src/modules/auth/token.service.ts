/**
 * Token service — JWT access/refresh issuance + Redis-backed refresh sessions.
 *
 * TASK 6/7. Access tokens are short-lived, stateless JWTs. Refresh tokens are
 * rotating JWTs whose current `jti` is tracked per session in Redis (foundation
 * 00/05: Redis owns "sessions/refresh" — there is no refresh-token DB table, so the
 * approved schema is untouched). This gives:
 *   - generate  → issueTokens()        (login)
 *   - verify    → verifyAccessToken() / verifyRefreshSession()
 *   - refresh   → rotateRefreshToken() (rotation + reuse detection)
 *   - revoke    → revokeSession() (logout) / revokeAllSessions() (disable/password change)
 *
 * Multi-session ready: each login creates a distinct session id (`sid`); a user may
 * hold many concurrent sessions, each its own Redis key, revocable independently.
 */
import { randomUUID } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { redis } from '@/services/redis';
import { jwtConfig } from '@/config';
import { logger } from '@/shared/logger';
import { AuthenticationError } from '@/shared/errors';
import type {
  AccessTokenClaims,
  RefreshTokenClaims,
  IssuedTokens,
} from './auth.types';

const tokenLog = logger.child({ component: 'token-service' });

/** Redis key for a session's current refresh `jti`. One key per (user, session). */
function sessionKey(userId: string, sessionId: string): string {
  return `auth:rt:${userId}:${sessionId}`;
}

function signAccess(userId: string, sessionId: string): string {
  const claims: AccessTokenClaims = { sub: userId, sid: sessionId, type: 'access' };
  const options: SignOptions = { expiresIn: jwtConfig.accessTtl, issuer: jwtConfig.issuer };
  return jwt.sign(claims, jwtConfig.secret, options);
}

function signRefresh(userId: string, sessionId: string, jti: string): string {
  const claims: RefreshTokenClaims = { sub: userId, sid: sessionId, jti, type: 'refresh' };
  const options: SignOptions = { expiresIn: jwtConfig.refreshTtl, issuer: jwtConfig.issuer };
  return jwt.sign(claims, jwtConfig.secret, options);
}

/** Persist the current refresh `jti` for a session, with the refresh TTL (sliding). */
async function storeSession(userId: string, sessionId: string, jti: string): Promise<void> {
  await redis.set(sessionKey(userId, sessionId), jti, 'EX', jwtConfig.refreshTtl);
}

/**
 * Issue a fresh access + refresh pair for a NEW session (login). Returns the tokens
 * and the new session id; the refresh `jti` is recorded in Redis.
 */
export async function issueTokens(userId: string): Promise<IssuedTokens> {
  const sessionId = randomUUID();
  const jti = randomUUID();
  await storeSession(userId, sessionId, jti);
  return {
    userId,
    accessToken: signAccess(userId, sessionId),
    expiresIn: jwtConfig.accessTtl,
    refreshToken: signRefresh(userId, sessionId, jti),
    sessionId,
  };
}

/** Verify an access token's signature/issuer/type. Throws `AuthenticationError`. */
export function verifyAccessToken(token: string): AccessTokenClaims {
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, jwtConfig.secret, { issuer: jwtConfig.issuer });
  } catch {
    throw new AuthenticationError('Invalid or expired access token.');
  }
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    (decoded as { type?: unknown }).type !== 'access'
  ) {
    throw new AuthenticationError('Invalid access token.');
  }
  return decoded as AccessTokenClaims;
}

/** Verify a refresh token's signature/issuer/type only (no Redis check). */
function decodeRefresh(token: string): RefreshTokenClaims {
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, jwtConfig.secret, { issuer: jwtConfig.issuer });
  } catch {
    throw new AuthenticationError('Invalid or expired refresh token.');
  }
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    (decoded as { type?: unknown }).type !== 'refresh'
  ) {
    throw new AuthenticationError('Invalid refresh token.');
  }
  return decoded as RefreshTokenClaims;
}

/**
 * Verify a refresh token AND that it is the session's current token (not revoked,
 * not rotated away). Returns the validated claims. Throws on any mismatch.
 */
export async function verifyRefreshSession(token: string): Promise<RefreshTokenClaims> {
  const claims = decodeRefresh(token);
  const current = await redis.get(sessionKey(claims.sub, claims.sid));
  if (current === null) {
    // Session was logged out, expired, or never existed.
    throw new AuthenticationError('Refresh session is no longer valid.');
  }
  if (current !== claims.jti) {
    // A superseded refresh token was replayed → treat as theft; kill the session.
    await redis.del(sessionKey(claims.sub, claims.sid));
    tokenLog.warn({ userId: claims.sub, sessionId: claims.sid }, 'Refresh token reuse detected; session revoked');
    throw new AuthenticationError('Refresh token has been superseded.');
  }
  return claims;
}

/**
 * Rotate a refresh token: validate the presented one, mint a NEW access + refresh
 * pair on the SAME session, and replace the stored `jti`. Reuse is detected in
 * `verifyRefreshSession`.
 */
export async function rotateRefreshToken(token: string): Promise<IssuedTokens> {
  const claims = await verifyRefreshSession(token);
  const nextJti = randomUUID();
  await storeSession(claims.sub, claims.sid, nextJti);
  return {
    userId: claims.sub,
    accessToken: signAccess(claims.sub, claims.sid),
    expiresIn: jwtConfig.accessTtl,
    refreshToken: signRefresh(claims.sub, claims.sid, nextJti),
    sessionId: claims.sid,
  };
}

/**
 * Revoke a single session (logout). Idempotent: a missing/invalid token is a no-op
 * so logout never fails. Returns the user id when a session was actually revoked.
 */
export async function revokeSession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  let claims: RefreshTokenClaims;
  try {
    claims = decodeRefresh(token);
  } catch {
    return null; // Already invalid/expired — nothing to revoke.
  }
  await redis.del(sessionKey(claims.sub, claims.sid));
  return claims.sub;
}

/**
 * Revoke ALL sessions for a user (future: account disable / password change).
 * Scans the user's session keyspace and deletes every session key.
 */
export async function revokeAllSessions(userId: string): Promise<number> {
  const pattern = sessionKey(userId, '*');
  let cursor = '0';
  let removed = 0;
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = next;
    if (keys.length > 0) {
      removed += await redis.del(...keys);
    }
  } while (cursor !== '0');
  return removed;
}

export const tokenService = {
  issueTokens,
  verifyAccessToken,
  verifyRefreshSession,
  rotateRefreshToken,
  revokeSession,
  revokeAllSessions,
};
