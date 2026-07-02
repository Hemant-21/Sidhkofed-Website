/**
 * Unit tests — permission resolution: multi-role merge, super-admin detection, Redis
 * caching + invalidation, and the pure has-all / has-any helpers.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { store, repo } = vi.hoisted(() => ({
  store: new Map<string, string>(),
  repo: { findRolesAndPermissions: vi.fn() },
}));

vi.mock('@/services/redis', () => ({
  redis: {
    async get(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    async set(key: string, value: string) {
      store.set(key, value);
      return 'OK';
    },
    async del(key: string) {
      return store.delete(key) ? 1 : 0;
    },
  },
}));

vi.mock('./auth.repository', () => ({ authRepository: repo }));

import { permissionService } from './permission.service';

const USER = '22222222-2222-2222-2222-222222222222';

beforeEach(() => {
  store.clear();
  repo.findRolesAndPermissions.mockReset();
});

describe('permission.service', () => {
  it('merges and dedupes permissions across multiple roles', async () => {
    repo.findRolesAndPermissions.mockResolvedValue({
      roleKeys: ['content_editor', 'publisher'],
      permissionKeys: ['content.create', 'content.update', 'content.publish'],
    });
    const authz = await permissionService.getUserAuthorization(USER);
    expect(authz.roles).toEqual(['content_editor', 'publisher']);
    expect(new Set(authz.permissions)).toEqual(
      new Set(['content.create', 'content.update', 'content.publish']),
    );
    expect(authz.isSuperAdmin).toBe(false);
  });

  it('flags super_admin and treats it as allow-all in the helpers', async () => {
    repo.findRolesAndPermissions.mockResolvedValue({ roleKeys: ['super_admin'], permissionKeys: [] });
    const authz = await permissionService.getUserAuthorization(USER);
    expect(authz.isSuperAdmin).toBe(true);
    expect(permissionService.hasAllPermissions(authz, ['anything.at.all'])).toBe(true);
    expect(permissionService.hasAnyRole(authz, ['nonexistent'])).toBe(true);
  });

  it('caches the resolution and serves the second call from Redis', async () => {
    repo.findRolesAndPermissions.mockResolvedValue({ roleKeys: ['publisher'], permissionKeys: ['content.publish'] });
    await permissionService.getUserAuthorization(USER);
    await permissionService.getUserAuthorization(USER);
    expect(repo.findRolesAndPermissions).toHaveBeenCalledTimes(1);
  });

  it('invalidates the cache so the next read re-queries the DB', async () => {
    repo.findRolesAndPermissions.mockResolvedValue({ roleKeys: ['publisher'], permissionKeys: ['content.publish'] });
    await permissionService.getUserAuthorization(USER);
    await permissionService.invalidateUserAuthorization(USER);
    await permissionService.getUserAuthorization(USER);
    expect(repo.findRolesAndPermissions).toHaveBeenCalledTimes(2);
  });

  it('hasAllPermissions requires every key; hasAnyRole requires one', () => {
    const authz = { roles: ['publisher'], permissions: ['content.publish', 'content.archive'], isSuperAdmin: false };
    expect(permissionService.hasAllPermissions(authz, ['content.publish'])).toBe(true);
    expect(permissionService.hasAllPermissions(authz, ['content.publish', 'content.create'])).toBe(false);
    expect(permissionService.hasAnyRole(authz, ['publisher', 'content_editor'])).toBe(true);
    expect(permissionService.hasAnyRole(authz, ['content_editor'])).toBe(false);
  });
});
