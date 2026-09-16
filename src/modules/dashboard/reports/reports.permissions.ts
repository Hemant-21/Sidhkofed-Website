/**
 * Reuses the existing `operational_reports.*` permission keys (seeded in `auth.permissions.ts`)
 * rather than minting new ones — this module replaces the six-report catalogue behind the same
 * "Generate Reports" surface, not a new feature, so the same view/export grants apply.
 */
export const REPORTS_PERMISSIONS = {
  view: 'operational_reports.view',
  export: 'operational_reports.export',
} as const;
