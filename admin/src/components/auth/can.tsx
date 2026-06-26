'use client';

/**
 * `<Can>` — declarative permission-aware rendering. Renders children only when the
 * current user holds the required permission(s); otherwise renders `fallback`
 * (default: nothing). Drives "Can Publish / Can Archive / Can Create …" affordances
 * straight from backend permissions.
 *
 *   <Can permission="events.publish"><PublishButton/></Can>
 *   <Can anyOf={['events.update','events.publish']}>…</Can>
 */

import type { ReactNode } from 'react';
import type { Permission } from '@/types/auth';
import { usePermissions } from '@/hooks/use-permissions';

interface CanProps {
  /** A single required permission. */
  permission?: Permission;
  /** Require ALL of these. */
  allOf?: Permission[];
  /** Require ANY of these. */
  anyOf?: Permission[];
  /** Require membership of this role (affordance only). */
  role?: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function Can({ permission, allOf, anyOf, role, children, fallback = null }: CanProps) {
  const { can, canAll, canAny, hasRole } = usePermissions();

  const checks: boolean[] = [];
  if (permission) checks.push(can(permission));
  if (allOf && allOf.length) checks.push(canAll(allOf));
  if (anyOf && anyOf.length) checks.push(canAny(anyOf));
  if (role) checks.push(hasRole(role));

  // No constraint supplied → render (nothing to gate on).
  const allowed = checks.length === 0 ? true : checks.every(Boolean);
  return <>{allowed ? children : fallback}</>;
}
