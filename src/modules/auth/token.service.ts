/**
 * Token service - JWT access/refresh issuance + PostgreSQL-backed refresh sessions.
 *
 * Access tokens are short-lived, stateless JWTs. Refresh tokens are rotating JWTs
 * whose current `jti` is tracked per session in PostgreSQL.
 */
import { randomUUID } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '@/db/prisma';
import { jwtConfig } from '@/config';
import { logger } from '@/shared/logger';
import { AuthenticationError } from '@/shared/errors';
import type { AccessTokenClaims, RefreshTokenClaims, IssuedTokens } from './auth.types';

const tokenLog = logger.child({ component: 'token-service' });

function refreshExpiry(): Date {
  return new Date(Date.now() + jwtConfig.refreshTtl * 1000);
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

async function storeSession(userId: string, sessionId: string, jti: string): Promise<void> {
  await prisma.authRefreshSession.upsert({
    where: { sessionId },
    create: {
      sessionId,
      userId,
      currentJti: jti,
      expiresAt: refreshExpiry(),
    },
    update: {
      currentJti: jti,
      expiresAt: refreshExpiry(),
      revokedAt: null,
    },
  });
}

async function issueTokens(userId: string): Promise<IssuedTokens> {
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

function verifyAccessToken(token: string): AccessTokenClaims {
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

async function verifyRefreshSession(token: string): Promise<RefreshTokenClaims> {
  const claims = decodeRefresh(token);
  const session = await prisma.authRefreshSession.findUnique({ where: { sessionId: claims.sid } });
  if (
    !session ||
    session.userId !== claims.sub ||
    session.revokedAt ||
    session.expiresAt.getTime() <= Date.now()
  ) {
    throw new AuthenticationError('Refresh session is no longer valid.');
  }

  if (session.currentJti !== claims.jti) {
    await prisma.authRefreshSession.update({
      where: { sessionId: claims.sid },
      data: { revokedAt: new Date() },
    });
    tokenLog.warn({ userId: claims.sub, sessionId: claims.sid }, 'Refresh token reuse detected; session revoked');
    throw new AuthenticationError('Refresh token has been superseded.');
  }

  return claims;
}

async function rotateRefreshToken(token: string): Promise<IssuedTokens> {
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

async function revokeSession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  let claims: RefreshTokenClaims;
  try {
    claims = decodeRefresh(token);
  } catch {
    return null;
  }
  await prisma.authRefreshSession.updateMany({
    where: { sessionId: claims.sid, userId: claims.sub, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return claims.sub;
}

async function revokeAllSessions(userId: string): Promise<number> {
  const result = await prisma.authRefreshSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

export const tokenService = {
  issueTokens,
  verifyAccessToken,
  verifyRefreshSession,
  rotateRefreshToken,
  revokeSession,
  revokeAllSessions,
};
