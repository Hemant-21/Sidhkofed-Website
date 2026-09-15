/**
 * Named permission keys for the Operational Reports module. Hand-picked keys (not the generic
 * 7-action/4-action builders in `auth.permissions.ts`) — same precedent as `dashboard.*` — because
 * this is a read+export-only, code-fixed report catalogue with no create/update/publish lifecycle
 * of its own. Seeded centrally in `src/modules/auth/auth.permissions.ts`.
 */
export const OPERATIONAL_REPORTS_PERMISSIONS = {
  view: 'operational_reports.view',
  export: 'operational_reports.export',
} as const;
