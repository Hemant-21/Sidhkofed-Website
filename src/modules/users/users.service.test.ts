/**
 * Unit tests — user service business rules: CRUD wiring, duplicate-email (409), unknown-role
 * validation (422), role/status mutations with audit + permission-cache invalidation, and the
 * privilege/lockout guards (no self-role change, no self-deactivation, last-active-Super-Admin
 * protection). Repository + cross-module services are mocked, so these run DB-free in `npm test`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { repo, audit, perms, pw } = vi.hoisted(() => ({
  repo: {
    list: vi.fn(),
    findById: vi.fn(),
    emailExists: vi.fn(),
    findPasswordHashById: vi.fn(),
    findRoleIdsByKeys: vi.fn(),
    countActiveSuperAdmins: vi.fn(),
    create: vi.fn(),
    updateProfile: vi.fn(),
    setRoles: vi.fn(),
    updatePassword: vi.fn(),
    setStatus: vi.fn(),
    transaction: vi.fn(),
  },
  audit: { create: vi.fn(), update: vi.fn() },
  perms: { getUserAuthorization: vi.fn(), invalidateUserAuthorization: vi.fn() },
  pw: { hashPassword: vi.fn(), verifyPassword: vi.fn() },
}));

vi.mock('./users.repository', () => ({ userRepository: repo }));
vi.mock('@/modules/audit/audit.service', () => ({ auditService: audit }));
vi.mock('@/modules/auth/permission.service', () => ({
  permissionService: perms,
  SUPER_ADMIN_ROLE: 'super_admin',
}));
vi.mock('@/modules/auth/password', () => ({ hashPassword: pw.hashPassword, verifyPassword: pw.verifyPassword }));

import { userService } from './users.service';
import { ConflictError, ValidationError, PermissionError, NotFoundError } from '@/shared/errors';

const NOW = new Date('2026-06-27T00:00:00.000Z');

/** A UserRow stand-in (only the fields the DTO/guards read matter). */
function makeRow(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'u-1',
    email: 'jane@sidhkofed.test',
    fullName: 'Jane Admin',
    preferredLanguage: 'en',
    isActive: true,
    lastLoginAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    userRoles: [{ role: { key: 'content_editor' } }],
    ...over,
  };
}

const ctx = (userId = 'actor-1') => ({ userId });

beforeEach(() => {
  vi.clearAllMocks();
  repo.emailExists.mockResolvedValue(false);
  repo.findRoleIdsByKeys.mockImplementation(async (keys: string[]) => new Map(keys.map((k) => [k, `role-${k}`])));
  repo.countActiveSuperAdmins.mockResolvedValue(1);
  repo.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn({}));
  pw.hashPassword.mockImplementation(async (p: string) => `hashed:${p}`);
  pw.verifyPassword.mockResolvedValue(true);
  perms.getUserAuthorization.mockResolvedValue({ roles: ['content_editor'], permissions: [], isSuperAdmin: false });
});

describe('userService.create', () => {
  it('hashes the password, assigns roles in a transaction, and audits CREATE', async () => {
    repo.create.mockResolvedValue(makeRow({ id: 'u-new' }));
    const dto = await userService.create(
      { email: 'New@Test.io', full_name: 'New User', password: 'secret123', roles: ['content_editor'] } as never,
      ctx(),
    );
    expect(pw.hashPassword).toHaveBeenCalledWith('secret123');
    expect(repo.transaction).toHaveBeenCalledOnce();
    expect(repo.create).toHaveBeenCalledOnce();
    expect(audit.create).toHaveBeenCalledOnce();
    expect(dto.roles).toEqual(['content_editor']);
    expect((dto as Record<string, unknown>).password_hash).toBeUndefined();
  });

  it('rejects a duplicate email with 409', async () => {
    repo.emailExists.mockResolvedValue(true);
    await expect(
      userService.create({ email: 'dupe@test.io', full_name: 'X', password: 'secret123', roles: ['publisher'] } as never, ctx()),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown role key with 422', async () => {
    repo.findRoleIdsByKeys.mockResolvedValue(new Map()); // none resolve
    await expect(
      userService.create({ email: 'a@test.io', full_name: 'X', password: 'secret123', roles: ['wizard'] } as never, ctx()),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('userService.update — duplicate email + self-role guard', () => {
  it('rejects renaming onto an existing email (409), excluding self', async () => {
    repo.findById.mockResolvedValue(makeRow());
    repo.emailExists.mockResolvedValue(true);
    await expect(userService.update('u-1', { email: 'taken@test.io' } as never, ctx())).rejects.toBeInstanceOf(ConflictError);
    expect(repo.emailExists).toHaveBeenCalledWith('taken@test.io', 'u-1');
  });

  it('forbids an actor changing their OWN roles (403)', async () => {
    repo.findById.mockResolvedValue(makeRow({ id: 'actor-1' }));
    await expect(
      userService.update('actor-1', { roles: ['super_admin'] } as never, ctx('actor-1')),
    ).rejects.toBeInstanceOf(PermissionError);
    expect(repo.setRoles).not.toHaveBeenCalled();
  });

  it('replaces roles and invalidates the permission cache when roles change', async () => {
    repo.findById.mockResolvedValueOnce(makeRow()).mockResolvedValueOnce(makeRow({ userRoles: [{ role: { key: 'publisher' } }] }));
    await userService.update('u-1', { roles: ['publisher'] } as never, ctx());
    expect(repo.setRoles).toHaveBeenCalledOnce();
    expect(perms.invalidateUserAuthorization).toHaveBeenCalledWith('u-1');
    expect(audit.update).toHaveBeenCalledOnce();
  });
});

describe('userService — last active Super Admin protection', () => {
  it('blocks demoting the last active Super Admin (409)', async () => {
    repo.findById.mockResolvedValue(makeRow({ userRoles: [{ role: { key: 'super_admin' } }], isActive: true }));
    repo.countActiveSuperAdmins.mockResolvedValue(0);
    await expect(userService.update('u-1', { roles: ['content_editor'] } as never, ctx())).rejects.toBeInstanceOf(ConflictError);
    expect(repo.setRoles).not.toHaveBeenCalled();
  });

  it('blocks deactivating the last active Super Admin (409)', async () => {
    repo.findById.mockResolvedValue(makeRow({ userRoles: [{ role: { key: 'super_admin' } }], isActive: true }));
    repo.countActiveSuperAdmins.mockResolvedValue(0);
    await expect(userService.setStatus('u-1', { is_active: false } as never, ctx())).rejects.toBeInstanceOf(ConflictError);
    expect(repo.setStatus).not.toHaveBeenCalled();
  });

  it('allows demoting a Super Admin when another active Super Admin remains', async () => {
    repo.findById
      .mockResolvedValueOnce(makeRow({ userRoles: [{ role: { key: 'super_admin' } }], isActive: true }))
      .mockResolvedValueOnce(makeRow({ userRoles: [{ role: { key: 'content_editor' } }] }));
    repo.countActiveSuperAdmins.mockResolvedValue(1);
    await expect(userService.update('u-1', { roles: ['content_editor'] } as never, ctx())).resolves.toBeDefined();
    expect(repo.setRoles).toHaveBeenCalledOnce();
  });
});

describe('userService.setStatus', () => {
  it('forbids an actor deactivating their OWN account (403)', async () => {
    repo.findById.mockResolvedValue(makeRow({ id: 'actor-1', userRoles: [{ role: { key: 'publisher' } }] }));
    await expect(userService.setStatus('actor-1', { is_active: false } as never, ctx('actor-1'))).rejects.toBeInstanceOf(
      PermissionError,
    );
  });

  it('deactivates another user, invalidates cache, and audits', async () => {
    repo.findById.mockResolvedValue(makeRow({ userRoles: [{ role: { key: 'publisher' } }], isActive: true }));
    repo.setStatus.mockResolvedValue(makeRow({ isActive: false }));
    const dto = await userService.setStatus('u-1', { is_active: false } as never, ctx());
    expect(dto.is_active).toBe(false);
    expect(perms.invalidateUserAuthorization).toHaveBeenCalledWith('u-1');
    expect(audit.update).toHaveBeenCalledOnce();
  });

  it('is a no-op when status is unchanged (no write, no audit)', async () => {
    repo.findById.mockResolvedValue(makeRow({ isActive: true }));
    await userService.setStatus('u-1', { is_active: true } as never, ctx());
    expect(repo.setStatus).not.toHaveBeenCalled();
    expect(audit.update).not.toHaveBeenCalled();
  });
});

describe('userService.resetPassword (admin)', () => {
  it('hashes + writes the new password and audits a reset', async () => {
    repo.findById.mockResolvedValue(makeRow());
    await userService.resetPassword('u-1', { password: 'brandnew1' } as never, ctx());
    expect(pw.hashPassword).toHaveBeenCalledWith('brandnew1');
    expect(repo.updatePassword).toHaveBeenCalledWith('u-1', 'hashed:brandnew1');
    expect(audit.update).toHaveBeenCalledOnce();
  });

  it('404s when the target user does not exist', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(userService.resetPassword('missing', { password: 'brandnew1' } as never, ctx())).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe('userService — self-service profile', () => {
  it('updates own profile and returns the auth-user (roles+permissions) shape', async () => {
    repo.findById.mockResolvedValue(makeRow({ id: 'actor-1' }));
    repo.updateProfile.mockResolvedValue(makeRow({ id: 'actor-1', fullName: 'Renamed' }));
    const dto = await userService.updateOwnProfile({ full_name: 'Renamed' } as never, ctx('actor-1'));
    expect(dto.full_name).toBe('Renamed');
    expect(dto).toHaveProperty('permissions');
    expect(audit.update).toHaveBeenCalledOnce();
  });

  it('changes own password after verifying the current one', async () => {
    repo.findPasswordHashById.mockResolvedValue('hashed:old');
    await userService.changeOwnPassword({ current_password: 'oldpass1', new_password: 'newpass12' } as never, ctx('actor-1'));
    expect(pw.verifyPassword).toHaveBeenCalledWith('oldpass1', 'hashed:old');
    expect(repo.updatePassword).toHaveBeenCalledWith('actor-1', 'hashed:newpass12');
    expect(audit.update).toHaveBeenCalledOnce();
  });

  it('rejects a wrong current password with 422 (no write)', async () => {
    repo.findPasswordHashById.mockResolvedValue('hashed:old');
    pw.verifyPassword.mockResolvedValue(false);
    await expect(
      userService.changeOwnPassword({ current_password: 'wrong', new_password: 'newpass12' } as never, ctx('actor-1')),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.updatePassword).not.toHaveBeenCalled();
  });
});
