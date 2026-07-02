/**
 * Auth controller — HTTP in/out only (coding-standards §4). Parses the request, calls
 * the service, manages the refresh cookie, and returns through the shared envelope.
 * No business logic, no Prisma here. Async handlers forward errors via `.catch(next)`.
 */
import { createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { success } from '@/shared/envelope';
import { AuthenticationError } from '@/shared/errors';
import { jwtConfig, abuseConfig, appConfig } from '@/config';
import { authService } from './auth.service';
import { validateLogin, validateRefreshBody } from './auth.validators';

/** Cookie options for the rotating refresh token (API spec §1.2: Secure/HttpOnly/SameSite). */
function refreshCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: jwtConfig.refreshCookie.secure,
    sameSite: jwtConfig.refreshCookie.sameSite,
    // Scope the cookie to the auth namespace; it is only needed by refresh/logout.
    path: `${appConfig.apiBasePath}/auth`,
    maxAge: jwtConfig.refreshTtl * 1000,
  };
}

/** Privacy-safe client IP hash for audit (never store the raw IP). */
function ipHash(req: Request): string {
  const ip = req.ip ?? 'unknown';
  return createHash('sha256').update(`${ip}:${abuseConfig.ipHashSalt}`).digest('hex');
}

/** Read the refresh token from the HttpOnly cookie (browser) or `refresh_token` body (native). */
function resolveRefreshToken(req: Request): string | undefined {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  const fromCookie = cookies?.[jwtConfig.refreshCookie.name];
  if (fromCookie) return fromCookie;
  const body = validateRefreshBody(req.body);
  return body.refresh_token;
}

/** `POST /auth/login` — issue tokens, set the refresh cookie, return the session. */
export function login(req: Request, res: Response, next: NextFunction): void {
  const input = validateLogin(req.body);
  authService
    .login(input, { ipHash: ipHash(req) })
    .then(({ session, refreshToken }) => {
      res.cookie(jwtConfig.refreshCookie.name, refreshToken, refreshCookieOptions());
      res.status(200).json(success(session, String(req.id), 'Login successful.'));
    })
    .catch(next);
}

/** `POST /auth/refresh` — rotate the refresh token and return a fresh session. */
export function refresh(req: Request, res: Response, next: NextFunction): void {
  let token: string | undefined;
  try {
    token = resolveRefreshToken(req);
  } catch (err) {
    return next(err);
  }
  authService
    .refresh(token)
    .then(({ session, refreshToken }) => {
      res.cookie(jwtConfig.refreshCookie.name, refreshToken, refreshCookieOptions());
      res.status(200).json(success(session, String(req.id)));
    })
    .catch(next);
}

/** `POST /auth/logout` — revoke the session, clear the cookie. Idempotent → 204. */
export function logout(req: Request, res: Response, next: NextFunction): void {
  let token: string | undefined;
  try {
    token = resolveRefreshToken(req);
  } catch (err) {
    return next(err);
  }
  authService
    .logout(token, { ipHash: ipHash(req) })
    .then(() => {
      res.clearCookie(jwtConfig.refreshCookie.name, refreshCookieOptions());
      res.status(204).end();
    })
    .catch(next);
}

/** `GET /auth/me` — return the authenticated user's profile + roles/permissions. */
export function me(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required.'));
  }
  authService
    .getMe(req.user.id)
    .then((user) => res.status(200).json(success(user, String(req.id))))
    .catch(next);
}

export const authController = { login, refresh, logout, me };
