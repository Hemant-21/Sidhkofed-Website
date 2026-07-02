/**
 * Named permission keys for the institutions module (API spec §8).
 *
 * Institutions are a publishable **P** content resource, so authorization reuses the project's
 * shared content RBAC exactly like documents/galleries/videos:
 *   - create / update / view  → Super Admin, Content Editor, Publisher
 *   - publish / unpublish / archive / restore → Super Admin, Publisher
 *
 * The `institutions.*` keys are the logical permissions the spec names; they map onto the seeded
 * generic `content.*` set (auth.permissions.ts), so a new content module is covered WITHOUT
 * re-seeding RBAC (development-rules §3). Exported for documentation/clarity.
 */
export const INSTITUTION_PERMISSIONS = {
  view: 'institutions.view',
  create: 'institutions.create',
  update: 'institutions.update',
  publish: 'institutions.publish',
  archive: 'institutions.archive',
  restore: 'institutions.restore',
} as const;

export const INSTITUTION_PERMISSION_TO_CONTENT: Record<string, string> = {
  'institutions.view': 'masters.view',
  'institutions.create': 'content.create',
  'institutions.update': 'content.update',
  'institutions.publish': 'content.publish',
  'institutions.archive': 'content.archive',
  'institutions.restore': 'content.restore',
};
