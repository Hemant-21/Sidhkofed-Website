/**
 * Named permission keys for the Website Metrics module. Hand-picked keys (not the generic
 * 7-action/4-action builders in `auth.permissions.ts`) — same precedent as `dashboard.*` and
 * `operational_reports.*` — because this module's lifecycle (configure → preview → publish) does
 * not fit the generic content create/update/publish shape (there is no "draft content", only a
 * configuration and a series of frozen snapshots). Seeded centrally in
 * `src/modules/auth/auth.permissions.ts`.
 */
export const WEBSITE_METRICS_PERMISSIONS = {
  view: 'website_metrics.view',
  manageData: 'website_metrics.manage_data',
  publish: 'website_metrics.publish',
  unpublish: 'website_metrics.unpublish',
  archive: 'website_metrics.archive',
  restore: 'website_metrics.restore',
} as const;
