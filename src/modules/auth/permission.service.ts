/**
 * Permission resolution service (TASK 10).
 *
 * Responsibilities:
 *   - fetch a user's roles + permissions,
 *   - merge permissions across multiple roles (union, deduped),
 *   - cache the resolved authorization in Redis,
 *   - invalidate the cache when a user's roles/permissions change.
 *
 * `super_admin` is treated as an allow-all wildcard so new CMS modules need no
 * re-seed to be covered by Super Admin.
 */
import { redis } from '@/services/redis';
import { redisConfig } from '@/config';
import { logger } from '@/shared/logger';
import { authRepository } from './auth.repository';
import type { ResolvedAuthorization } from './auth.types';

const permLog = logger.child({ component: 'permission-service' });

export const SUPER_ADMIN_ROLE = 'super_admin';

/** Redis cache key for a user's resolved authorization. */
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
 * Resolve a user's authorization, using the Redis cache when available. A cache or
 * Redis failure falls back to a live DB read so authorization never hard-fails on a
 * cache outage.
 */
export async function getUserAuthorization(userId: string): Promise<ResolvedAuthorization> {
  const key = cacheKey(userId);
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as ResolvedAuthorization;
  } catch (err) {
    permLog.warn({ err, userId }, 'Permission cache read failed; falling back to DB');
  }

  const resolved = await resolveFromDb(userId);

  try {
    await redis.set(key, JSON.stringify(resolved), 'EX', redisConfig.cacheTtlSeconds);
  } catch (err) {
    permLog.warn({ err, userId }, 'Permission cache write failed');
  }
  return resolved;
}

/**
 * Invalidate a user's cached authorization. Call after any role/permission change
 * for that user (role assigned/removed, permission grant changes).
 */
export async function invalidateUserAuthorization(userId: string): Promise<void> {
  try {
    await redis.del(cacheKey(userId));
  } catch (err) {
    permLog.warn({ err, userId }, 'Permission cache invalidation failed');
  }
}

/** True when the user holds every one of the required permission keys (super admin bypasses). */
export function hasAllPermissions(auth: ResolvedAuthorization, required: string[]): boolean {
  if (auth.isSuperAdmin) return true;
  const owned = new Set(auth.permissions);
  return required.every((p) => owned.has(p));
}

/** True when the user holds any of the required role keys (super admin bypasses). */
export function hasAnyRole(auth: ResolvedAuthorization, required: string[]): boolean {
  if (auth.isSuperAdmin) return true;
  const owned = new Set(auth.roles);
  return required.some((r) => owned.has(r));
}

export const permissionService = {
  getUserAuthorization,
  invalidateUserAuthorization,
  hasAllPermissions,
  hasAnyRole,
};
