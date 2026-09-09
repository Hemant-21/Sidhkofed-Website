/**
 * Permission resolution service (TASK 10).
 *
 * Responsibilities:
 *   - fetch a user's roles + permissions,
 *   - merge permissions across multiple roles (union, deduped),
 *   - cache the resolved authorization in-process,
 *   - invalidate the cache when a user's roles/permissions change.
 *
 * `super_admin` is treated as an allow-all wildcard so new CMS modules need no
 * re-seed to be covered by Super Admin.
 */
import { cacheService } from '@/services/cache';
import { authRepository } from './auth.repository';
import type { ResolvedAuthorization } from './auth.types';

export const SUPER_ADMIN_ROLE = 'super_admin';

function cacheKey(userId: string): string {
  return `auth:perms:${userId}`;
}

/** Build the resolved authorization from the database (no cache). */
async function resolveFromDb(userId: string): Promise<ResolvedAuthorization> {
  const { roleKeys, permissionKeys } = await authRepository.findRolesAndPermissions(userId);
  return {
    roles: roleKeys,
    permissions: permissionKeys,
    isSuperAdmin: roleKeys.includes(SUPER_ADMIN_ROLE),
  };
}

/**
 * Resolve a user's authorization, using the in-process cache when available.
 */
async function getUserAuthorization(userId: string): Promise<ResolvedAuthorization> {
  const key = cacheKey(userId);
  const cached = await cacheService.getJson<ResolvedAuthorization>(key);
  if (cached) return cached;

  const resolved = await resolveFromDb(userId);
  await cacheService.setJson(key, resolved);
  return resolved;
}

/**
 * Invalidate a user's cached authorization. Call after any role/permission change
 * for that user (role assigned/removed, permission grant changes).
 */
async function invalidateUserAuthorization(userId: string): Promise<void> {
  await cacheService.del(cacheKey(userId));
}

/** True when the user holds every one of the required permission keys (super admin bypasses). */
function hasAllPermissions(auth: ResolvedAuthorization, required: string[]): boolean {
  if (auth.isSuperAdmin) return true;
  const owned = new Set(auth.permissions);
  return required.every((p) => owned.has(p));
}

/** True when the user holds ANY of the required permission keys (super admin bypasses). */
function hasAnyPermission(auth: ResolvedAuthorization, required: string[]): boolean {
  if (auth.isSuperAdmin) return true;
  const owned = new Set(auth.permissions);
  return required.some((p) => owned.has(p));
}

/** True when the user holds any of the required role keys (super admin bypasses). */
function hasAnyRole(auth: ResolvedAuthorization, required: string[]): boolean {
  if (auth.isSuperAdmin) return true;
  const owned = new Set(auth.roles);
  return required.some((r) => owned.has(r));
}

export const permissionService = {
  getUserAuthorization,
  invalidateUserAuthorization,
  hasAllPermissions,
  hasAnyPermission,
  hasAnyRole,
};
