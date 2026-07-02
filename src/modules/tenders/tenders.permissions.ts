/**
 * Named permission keys for the tenders module (API spec §8).
 *
 * Tenders are a publishable **P** content resource, so authorization reuses the project's shared
 * content RBAC exactly like documents/institutions:
 *   - create / update / view  → Super Admin, Content Editor, Publisher
 *   - publish / unpublish / archive / restore → Super Admin, Publisher
 *
 * The `tenders.*` keys map onto the seeded generic `content.*` set (auth.permissions.ts), so a new
 * content module is covered WITHOUT re-seeding RBAC (development-rules §3).
 */
export const TENDER_PERMISSIONS = {
  view: 'tenders.view',
  create: 'tenders.create',
  update: 'tenders.update',
  publish: 'tenders.publish',
  archive: 'tenders.archive',
  restore: 'tenders.restore',
} as const;

export const TENDER_PERMISSION_TO_CONTENT: Record<string, string> = {
  'tenders.view': 'masters.view',
  'tenders.create': 'content.create',
  'tenders.update': 'content.update',
  'tenders.publish': 'content.publish',
  'tenders.archive': 'content.archive',
  'tenders.restore': 'content.restore',
};
