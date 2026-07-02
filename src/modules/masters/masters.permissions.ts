/**
 * Named permission keys for the masters module (TASK 19 / API spec §8). Reads are dropdown
 * access for every CMS role; writes/activation are Super Admin only (the wildcard role).
 * These mirror the entries seeded in `auth.permissions.ts`.
 */
export const MASTER_PERMISSIONS = {
  view: 'masters.view',
  create: 'masters.create',
  update: 'masters.update',
  activate: 'masters.activate',
  deactivate: 'masters.deactivate',
  restore: 'masters.restore',
} as const;
