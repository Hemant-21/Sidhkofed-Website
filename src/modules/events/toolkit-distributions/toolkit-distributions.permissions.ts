/**
 * Named permission keys for the per-event toolkit-distribution summaries (API spec §1.2/§8).
 * A nested resource under an event — CRUD keys only (no publish lifecycle of its own; public
 * exposure follows the parent event's publication state). Seeded by the RBAC catalog. Super
 * Admin bypasses.
 */
export const TOOLKIT_DISTRIBUTION_PERMISSIONS = {
  view: 'toolkit_distributions.view',
  create: 'toolkit_distributions.create',
  update: 'toolkit_distributions.update',
  delete: 'toolkit_distributions.delete',
} as const;
