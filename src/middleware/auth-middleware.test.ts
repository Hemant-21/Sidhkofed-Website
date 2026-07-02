/**
 * RBAC tests — the authenticate() and authorize()/authorizePermissions() middleware.
 * Collaborators (token + permission services, repository) are mocked; we assert the
 * typed errors that the error handler maps to 401/403.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response } from 'express';

const { perms, tokenSvc, repo } = vi.hoisted(() => ({
  perms: { getUserAuthorization: vi.fn() },
  tokenSvc: { verifyAccessToken: vi.fn() },
  repo: { findUserById: vi.fn() },
}));

vi.mock('@/modules/auth/permission.service', () => ({ permissionService: { ...perms, hasAnyRole, hasAllPermissions } }));
vi.mock('@/modules/auth/token.service', () => ({ tokenService: tokenSvc }));
vi.mock('@/modules/auth/auth.repository', () => ({ authRepository: repo }));

// Re-use the real pure helpers so behavior matches production.
function hasAllPermissions(auth: { isSuperAdmin: boolean; permissions: string[] }, required: string[]): boolean {
  if (auth.isSuperAdmin) return true;
  const owned = new Set(auth.permissions);
  return required.every((p) => owned.has(p));
}
function hasAnyRole(auth: { isSuperAdmin: boolean; roles: string[] }, required: string[]): boolean {
  if (auth.isSuperAdmin) return true;
  const owned = new Set(auth.roles);
  return required.some((r) => owned.has(r));
}

import { authorize, authorizePermissions } from './authorize';
import { authenticate } from './authenticate';
import { AuthenticationError, PermissionError } from '@/shared/errors';

/** Invoke an Express middleware and resolve with whatever it passed to next(). */
function invoke(mw: (req: Request, res: Response, next: (e?: unknown) => void) => void, req: Partial<Request>): Promise<unknown> {
  return new Promise((resolve) => {
    mw(req as Request, {} as Response, (err?: unknown) => resolve(err));
  });
}

beforeEach(() => vi.clearAllMocks());

describe('authorize() — role guard', () => {
  it('passes a super_admin for any required role', async () => {
    perms.getUserAuthorization.mockResolvedValue({ roles: ['super_admin'], permissions: [], isSuperAdmin: true });
    const err = await invoke(authorize(['publisher']), { user: { id: 'u1' } as Request['user'] });
    expect(err).toBeUndefined();
  });

  it('passes a user holding one of the required roles', async () => {
    perms.getUserAuthorization.mockResolvedValue({ roles: ['publisher'], permissions: [], isSuperAdmin: false });
    const err = await invoke(authorize(['publisher', 'content_editor']), { user: { id: 'u1' } as Request['user'] });
    expect(err).toBeUndefined();
  });

  it('denies a user lacking the role with PermissionError (403)', async () => {
    perms.getUserAuthorization.mockResolvedValue({ roles: ['content_editor'], permissions: [], isSuperAdmin: false });
    const err = await invoke(authorize(['publisher']), { user: { id: 'u1' } as Request['user'] });
    expect(err).toBeInstanceOf(PermissionError);
  });

  it('rejects with AuthenticationError (401) when unauthenticated', async () => {
    const err = await invoke(authorize(['publisher']), {});
    expect(err).toBeInstanceOf(AuthenticationError);
  });
});

describe('authorizePermissions() — permission guard', () => {
  it('requires ALL listed permissions', async () => {
    perms.getUserAuthorization.mockResolvedValue({ roles: [], permissions: ['content.create'], isSuperAdmin: false });
    const ok = await invoke(authorizePermissions(['content.create']), { user: { id: 'u1' } as Request['user'] });
    expect(ok).toBeUndefined();
    const denied = await invoke(authorizePermissions(['content.create', 'content.publish']), { user: { id: 'u1' } as Request['user'] });
    expect(denied).toBeInstanceOf(PermissionError);
  });

  it('normalizes the module:action form to module.action', async () => {
    perms.getUserAuthorization.mockResolvedValue({ roles: [], permissions: ['content.create'], isSuperAdmin: false });
    const err = await invoke(authorizePermissions(['content:create']), { user: { id: 'u1' } as Request['user'] });
    expect(err).toBeUndefined();
  });

  it('super_admin bypasses any permission requirement', async () => {
    perms.getUserAuthorization.mockResolvedValue({ roles: ['super_admin'], permissions: [], isSuperAdmin: true });
    const err = await invoke(authorizePermissions(['events.create', 'events.publish']), { user: { id: 'u1' } as Request['user'] });
    expect(err).toBeUndefined();
  });
});

describe('authenticate()', () => {
  it('rejects a request without a Bearer token', async () => {
    const err = await invoke(authenticate, { headers: {} });
    expect(err).toBeInstanceOf(AuthenticationError);
  });

  it('attaches req.user for a valid token + active user', async () => {
    tokenSvc.verifyAccessToken.mockReturnValue({ sub: 'u1', sid: 's1', type: 'access' });
    repo.findUserById.mockResolvedValue({ id: 'u1', email: 'a@b.c', fullName: 'A', preferredLanguage: 'en', isActive: true });
    const req: Partial<Request> = { headers: { authorization: 'Bearer good.token' } };
    const err = await invoke(authenticate, req);
    expect(err).toBeUndefined();
    expect(req.user).toMatchObject({ id: 'u1', sessionId: 's1', isActive: true });
  });

  it('rejects a valid token for a deactivated user', async () => {
    tokenSvc.verifyAccessToken.mockReturnValue({ sub: 'u1', sid: 's1', type: 'access' });
    repo.findUserById.mockResolvedValue({ id: 'u1', email: 'a@b.c', fullName: 'A', preferredLanguage: 'en', isActive: false });
    const err = await invoke(authenticate, { headers: { authorization: 'Bearer good.token' } });
    expect(err).toBeInstanceOf(AuthenticationError);
  });
});
