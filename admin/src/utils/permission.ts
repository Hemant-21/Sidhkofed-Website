/**
 * Pure permission-check helpers operating over the backend-provided permission
 * array. No authority is defined here — these only test membership of the keys
 * the server granted. Super Admin is treated as all-access via the wildcard key
 * the backend may emit, but the array remains the source of truth.
 */

import type { Permission } from '@/types/auth';

const WILDCARD = '*';

/** True if the user holds the exact permission (or the global wildcard). */
export function hasPermission(granted: Permission[], required: Permission): boolean {
  if (granted.includes(WILDCARD)) return true;
  return granted.includes(required);
}

/** True if the user holds ALL required permissions. */
export function hasAllPermissions(granted: Permission[], required: Permission[]): boolean {
  if (granted.includes(WILDCARD)) return true;
  return required.every((p) => granted.includes(p));
}

/** True if the user holds ANY of the required permissions. */
export function hasAnyPermission(granted: Permission[], required: Permission[]): boolean {
  if (required.length === 0) return true;
  if (granted.includes(WILDCARD)) return true;
  return required.some((p) => granted.includes(p));
}

/** True if the user holds any role from the list. */
export function hasRole(roles: string[], required: string | string[]): boolean {
  const list = Array.isArray(required) ? required : [required];
  return list.some((r) => roles.includes(r));
}
