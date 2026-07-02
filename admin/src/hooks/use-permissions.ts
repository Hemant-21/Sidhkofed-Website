'use client';

/**
 * Authorization hooks. All checks read the backend-provided `permissions`/`roles`
 * arrays on the current user — the frontend grants nothing (codex §7). Use these
 * to drive permission-aware rendering: `const { can } = usePermissions();
 * can('events.publish')`.
 */

import { useMemo } from 'react';
import type { Permission } from '@/types/auth';
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  hasRole,
} from '@/utils/permission';
import { useAuth } from './use-auth';

export interface PermissionsApi {
  permissions: Permission[];
  roles: string[];
  /** Hold an exact permission key (or the wildcard). */
  can: (permission: Permission) => boolean;
  /** Hold every listed permission. */
  canAll: (permissions: Permission[]) => boolean;
  /** Hold at least one listed permission. */
  canAny: (permissions: Permission[]) => boolean;
  /** Belong to a role (display/affordance only — never the security boundary). */
  hasRole: (role: string | string[]) => boolean;
}

export function usePermissions(): PermissionsApi {
  const { user } = useAuth();

  return useMemo<PermissionsApi>(() => {
    const permissions = user?.permissions ?? [];
    const roles = user?.roles ?? [];
    return {
      permissions,
      roles,
      can: (permission) => hasPermission(permissions, permission),
      canAll: (list) => hasAllPermissions(permissions, list),
      canAny: (list) => hasAnyPermission(permissions, list),
      hasRole: (role) => hasRole(roles, role),
    };
  }, [user]);
}

/** Convenience single-permission hook: `const canPublish = useCan('events.publish');`. */
export function useCan(permission: Permission): boolean {
  return usePermissions().can(permission);
}
