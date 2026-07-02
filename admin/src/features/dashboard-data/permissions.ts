/**
 * Permission keys for the Dashboard Data module (dashboard.permissions.ts).
 *
 * The dashboard reuses the project's existing RBAC — no new authorization system:
 *   - Report DEFINITION + layout (create/PATCH) is Super Admin only (gated at the route with a role
 *     check; there is no report-builder permission). The UI affordance uses the `super_admin` role.
 *   - Report public LIFECYCLE (publish/unpublish/archive/restore) uses the dedicated `dashboard.*`
 *     keys (Publisher by default).
 *   - Metrics + datasets + Excel import are the "dashboard data" surface, gated by the
 *     module-specific permission `dashboard.manage_data` (Publisher by default; Content Editor by
 *     explicit grant; Super Admin via wildcard).
 *
 * These keys only MIRROR the seeded backend keys; the backend remains the security boundary.
 */

import { ROLE_KEYS } from '@/constants/permissions';

export const DASHBOARD_PERMS = {
  publish: 'dashboard.publish',
  unpublish: 'dashboard.unpublish',
  archive: 'dashboard.archive',
  restore: 'dashboard.restore',
  manageData: 'dashboard.manage_data',
} as const;

/** Report definition create/PATCH is Super Admin only (route-level role check). */
export const REPORT_DEFINITION_ROLES: string[] = [ROLE_KEYS.superAdmin];
