/**
 * Auth service — login, refresh, logout, and `me` business rules (TASK 5/6/7).
 *
 * Owns: credential verification, active-user enforcement, token issuance/rotation/
 * revocation (via token.service), live authorization resolution (permission.service),
 * and audit hooks (audit.service). Throws typed errors; returns no HTTP shapes.
 * Invalid-credential responses are deliberately generic to avoid user enumeration.
 */
import { AuthenticationError } from '@/shared/errors';
import { auditService } from '@/services/audit';
import { authRepository } from './auth.repository';
import { permissionService } from './permission.service';
import { tokenService } from './token.service';
import { verifyPassword } from './password';
import { toAuthUserDto } from './auth.mapper';
import type { AuthSessionDto, AuthUserDto } from './auth.dto';

/** Per-request context for audit fidelity. */
export interface AuthContext {
  ipHash?: string | null;
}

const GENERIC_INVALID = 'Invalid email or password.';

/** Build the login/refresh `data` payload for a known-good user id. */
async function buildSession(
  user: { id: string; email: string; fullName: string; preferredLanguage: 'en' | 'hi'; isActive: boolean },
  accessToken: string,
  expiresIn: number,
): Promise<AuthSessionDto> {
  const authz = await permissionService.getUserAuthorization(user.id);
  return {
    access_token: accessToken,
    expires_in: expiresIn,
    token_type: 'Bearer',
    user: toAuthUserDto(user, authz),
  };
}

/**
 * Authenticate by email + password. On success issues a token pair and returns the
 * session payload plus the refresh token (the controller sets the cookie). Records
 * LOGIN_SUCCESS / LOGIN_FAILED either way.
 */
export async function login(
  input: { email: string; password: string },
  ctx: AuthContext = {},
): Promise<{ session: AuthSessionDto; refreshToken: string }> {
  const user = await authRepository.findUserByEmail(input.email);

  const failLogin = async (reason: string, userId: string | null): Promise<never> => {
    await auditService.record({
      userId,
      action: 'login',
      module: 'auth',
      recordId: userId,
      newStatus: 'failed',
      summary: 'LOGIN_FAILED',
      metadata: { reason, email: input.email },
      ipHash: ctx.ipHash ?? null,
    });
    throw new AuthenticationError(GENERIC_INVALID);
  };

  if (!user) return failLogin('user_not_found', null);

  const passwordOk = await verifyPassword(input.password, user.passwordHash);
  if (!passwordOk) return failLogin('invalid_password', user.id);

  if (!user.isActive) return failLogin('user_disabled', user.id);

  const tokens = await tokenService.issueTokens(user.id);
  await authRepository.touchLastLogin(user.id);

  const session = await buildSession(user, tokens.accessToken, tokens.expiresIn);

  await auditService.record({
    userId: user.id,
    action: 'login',
    module: 'auth',
    recordId: user.id,
    newStatus: 'success',
    summary: 'LOGIN_SUCCESS',
    ipHash: ctx.ipHash ?? null,
  });

  return { session, refreshToken: tokens.refreshToken };
}

/**
 * Rotate a refresh token and return a fresh session. Rejects when the presented token
 * is invalid/expired/superseded or the user has since been disabled (session revoked).
 */
export async function refresh(
  refreshToken: string | undefined,
): Promise<{ session: AuthSessionDto; refreshToken: string }> {
  if (!refreshToken) {
    throw new AuthenticationError('Refresh token is required.');
  }

  const tokens = await tokenService.rotateRefreshToken(refreshToken);

  const user = await authRepository.findUserById(tokens.userId);
  if (!user || !user.isActive) {
    // User was deactivated/removed since the session began — revoke everything.
    await tokenService.revokeAllSessions(tokens.userId);
    throw new AuthenticationError('Account is no longer active.');
  }

  const session = await buildSession(user, tokens.accessToken, tokens.expiresIn);
  return { session, refreshToken: tokens.refreshToken };
}

/**
 * Revoke the current refresh session (logout). Idempotent: a missing/invalid token is
 * a no-op. Records LOGOUT when a session was actually revoked.
 */
export async function logout(refreshToken: string | undefined, ctx: AuthContext = {}): Promise<void> {
  const userId = await tokenService.revokeSession(refreshToken);
  if (userId) {
    await auditService.record({
      userId,
      action: 'logout',
      module: 'auth',
      recordId: userId,
      summary: 'LOGOUT',
      ipHash: ctx.ipHash ?? null,
    });
  }
}

/** Resolve the authenticated user's profile + live roles/permissions (`GET /auth/me`). */
export async function getMe(userId: string): Promise<AuthUserDto> {
  const user = await authRepository.findUserById(userId);
  if (!user || !user.isActive) {
    throw new AuthenticationError('Account is no longer active.');
  }
  const authz = await permissionService.getUserAuthorization(userId);
  return toAuthUserDto(user, authz);
}

export const authService = { login, refresh, logout, getMe };
