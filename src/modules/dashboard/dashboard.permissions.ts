/**
 * Named permission keys for the Dashboard module (API spec §8 RBAC matrix).
 *
 * The dashboard reuses the project's existing RBAC — NO new authorization system:
 *   - Reports are fixed, code-referenced records. Their DEFINITION + layout is Super Admin only
 *     (the report builder is explicitly out of scope); their public LIFECYCLE (publish/unpublish/
 *     archive/restore) uses dedicated `dashboard.*` keys (Publisher by default) so dashboard exposure
 *     can be granted independently of other content. Reads are role-based dropdown access for every
 *     CMS role.
 *   - Metrics + datasets + Excel import are the "dashboard data" surface. They are gated by the
 *     module-specific permission `dashboard.manage_data`, following the Phase-7 precedent of
 *     module-specific keys (auth.permissions.ts). It is granted to Publisher by default; a Content
 *     Editor needs an EXPLICIT grant (API spec §8: "Content Editor needs an explicit dashboard-data
 *     grant"); Super Admin holds every permission as a wildcard.
 *
 * Report definition create/PATCH is gated at the route with `authorize([super_admin])`, so no
 * report-builder permission is minted.
 */
export const DASHBOARD_PERMISSIONS = {
  /** Report public lifecycle. */
  publish: 'dashboard.publish',
  unpublish: 'dashboard.unpublish',
  archive: 'dashboard.archive',
  restore: 'dashboard.restore',
  /** Manage dashboard data: metric CRUD, dataset create + Excel import. */
  manageData: 'dashboard.manage_data',
} as const;
