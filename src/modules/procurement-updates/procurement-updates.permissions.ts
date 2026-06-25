/**
 * Named permission keys for the procurement-updates module (API spec §8).
 *
 * Procurement Updates are a publishable **P** content resource, so authorization reuses the project's
 * shared content RBAC exactly like documents/institutions:
 *   - create / update / view  → Super Admin, Content Editor, Publisher
 *   - publish / unpublish / archive / restore → Super Admin, Publisher
 *
 * The `procurement-updates.*` keys map onto the seeded generic `content.*` set (auth.permissions.ts),
 * so a new content module is covered WITHOUT re-seeding RBAC (development-rules §3).
 */
export const PROCUREMENT_UPDATE_PERMISSIONS = {
  view: 'procurement-updates.view',
  create: 'procurement-updates.create',
  update: 'procurement-updates.update',
  publish: 'procurement-updates.publish',
  archive: 'procurement-updates.archive',
  restore: 'procurement-updates.restore',
} as const;

export const PROCUREMENT_UPDATE_PERMISSION_TO_CONTENT: Record<string, string> = {
  'procurement-updates.view': 'masters.view',
  'procurement-updates.create': 'content.create',
  'procurement-updates.update': 'content.update',
  'procurement-updates.publish': 'content.publish',
  'procurement-updates.archive': 'content.archive',
  'procurement-updates.restore': 'content.restore',
};
