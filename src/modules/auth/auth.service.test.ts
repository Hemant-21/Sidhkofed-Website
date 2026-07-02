/**
 * Unit tests — auth service business rules: credential verification, active-user
 * enforcement, generic invalid-credential messaging, token issuance, audit hooks,
 * and idempotent logout. All collaborators are mocked (no DB/Redis).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { repo, tokens, perms, audit, password } = vi.hoisted(() => ({
  repo: {
    findUserByEmail: vi.fn(),
    findUserById: vi.fn(),
    touchLastLogin: vi.fn(),
    findRolesAndPermissions: vi.fn(),
  },
  tokens: { issueTokens: vi.fn(), rotateRefreshToken: vi.fn(), revokeSession: vi.fn(), revokeAllSessions: vi.fn() },
  perms: { getUserAuthorization: vi.fn() },
  audit: { record: vi.fn() },
  password: { verifyPassword: vi.fn(), hashPassword: vi.fn() },
}));

vi.mock('./auth.repository', () => ({ authRepository: repo }));
vi.mock('./token.service', () => ({ tokenService: tokens }));
vi.mock('./permission.service', () => ({ permissionService: perms }));
vi.mock('./password', () => password);
vi.mock('@/services/audit', () => ({ auditService: audit }));

import { authService } from './auth.service';
import { AuthenticationError } from '@/shared/errors';

const ACTIVE_USER = {
  id: '33333333-3333-3333-3333-333333333333',
  email: 'admin@sidhkofed.example',
  passwordHash: 'hashed',
  fullName: 'Admin',
  preferredLanguage: 'en' as const,
  isActive: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  perms.getUserAuthorization.mockResolvedValue({ roles: ['super_admin'], permissions: [], isSuperAdmin: true });
  tokens.issueTokens.mockResolvedValue({
    userId: ACTIVE_USER.id,
    accessToken: 'access.jwt',
    expiresIn: 900,
    refreshToken: 'refresh.jwt',
    sessionId: 'sid-1',
  });
});

describe('authService.login', () => {
  it('logs an active user in, issues tokens, touches last login, and audits LOGIN_SUCCESS', async () => {
    repo.findUserByEmail.mockResolvedValue(ACTIVE_USER);
    password.verifyPassword.mockResolvedValue(true);

    const { session, refreshToken } = await authService.login({ email: ACTIVE_USER.email, password: 'pw' });

    expect(session.token_type).toBe('Bearer');
    expect(session.access_token).toBe('access.jwt');
    expect(session.expires_in).toBe(900);
    expect(session.user.email).toBe(ACTIVE_USER.email);
    expect(session.user.roles).toContain('super_admin');
    expect(refreshToken).toBe('refresh.jwt');
    expect(repo.touchLastLogin).toHaveBeenCalledWith(ACTIVE_USER.id);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ summary: 'LOGIN_SUCCESS', action: 'login' }));
  });

  it('rejects an unknown email with a generic message and audits LOGIN_FAILED (no user id)', async () => {
    repo.findUserByEmail.mockResolvedValue(null);
    await expect(authService.login({ email: 'nope@x.com', password: 'pw' })).rejects.toBeInstanceOf(
      AuthenticationError,
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'LOGIN_FAILED', userId: null, metadata: expect.objectContaining({ reason: 'user_not_found' }) }),
    );
    expect(tokens.issueTokens).not.toHaveBeenCalled();
  });

  it('rejects a wrong password with the same generic message', async () => {
    repo.findUserByEmail.mockResolvedValue(ACTIVE_USER);
    password.verifyPassword.mockResolvedValue(false);
    await expect(authService.login({ email: ACTIVE_USER.email, password: 'bad' })).rejects.toThrow(
      'Invalid email or password.',
    );
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ reason: 'invalid_password' }) }));
  });

  it('refuses a disabled user even with the correct password', async () => {
    repo.findUserByEmail.mockResolvedValue({ ...ACTIVE_USER, isActive: false });
    password.verifyPassword.mockResolvedValue(true);
    await expect(authService.login({ email: ACTIVE_USER.email, password: 'pw' })).rejects.toBeInstanceOf(
      AuthenticationError,
    );
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ reason: 'user_disabled' }) }));
    expect(tokens.issueTokens).not.toHaveBeenCalled();
  });
});

describe('authService.logout', () => {
  it('audits LOGOUT when a session was revoked', async () => {
    tokens.revokeSession.mockResolvedValue(ACTIVE_USER.id);
    await authService.logout('refresh.jwt');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ summary: 'LOGOUT', action: 'logout' }));
  });

  it('is a no-op (no audit) when there is no valid session', async () => {
    tokens.revokeSession.mockResolvedValue(null);
    await authService.logout(undefined);
    expect(audit.record).not.toHaveBeenCalled();
  });
});

describe('authService.refresh', () => {
  it('rotates and returns a fresh session for an active user', async () => {
    tokens.rotateRefreshToken.mockResolvedValue({
      userId: ACTIVE_USER.id,
      accessToken: 'access2',
      expiresIn: 900,
      refreshToken: 'refresh2',
      sessionId: 'sid-1',
    });
    repo.findUserById.mockResolvedValue({ ...ACTIVE_USER, passwordHash: undefined });
    const { session, refreshToken } = await authService.refresh('refresh.jwt');
    expect(session.access_token).toBe('access2');
    expect(refreshToken).toBe('refresh2');
  });

  it('revokes all sessions and rejects if the user became inactive', async () => {
    tokens.rotateRefreshToken.mockResolvedValue({ userId: ACTIVE_USER.id, accessToken: 'a', expiresIn: 900, refreshToken: 'r', sessionId: 's' });
    repo.findUserById.mockResolvedValue({ ...ACTIVE_USER, isActive: false });
    await expect(authService.refresh('refresh.jwt')).rejects.toBeInstanceOf(AuthenticationError);
    expect(tokens.revokeAllSessions).toHaveBeenCalledWith(ACTIVE_USER.id);
  });

  it('rejects when no refresh token is supplied', async () => {
    await expect(authService.refresh(undefined)).rejects.toBeInstanceOf(AuthenticationError);
  });
});

describe('authService.getMe', () => {
  it('returns the profile with merged roles/permissions', async () => {
    repo.findUserById.mockResolvedValue(ACTIVE_USER);
    perms.getUserAuthorization.mockResolvedValue({ roles: ['publisher'], permissions: ['content.publish'], isSuperAdmin: false });
    const me = await authService.getMe(ACTIVE_USER.id);
    expect(me.roles).toEqual(['publisher']);
    expect(me.permissions).toEqual(['content.publish']);
    expect(me).not.toHaveProperty('password_hash');
  });

  it('throws if the user is gone or inactive', async () => {
    repo.findUserById.mockResolvedValue(null);
    await expect(authService.getMe('missing')).rejects.toBeInstanceOf(AuthenticationError);
  });
});
