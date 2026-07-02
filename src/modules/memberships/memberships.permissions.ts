/**
 * Named permission keys for the Institutional Membership module (API spec §8).
 *
 * Memberships are a publishable **P** content resource, so authorization reuses the project's
 * shared content RBAC exactly like institutions/faqs:
 *   - create / update / view  → Super Admin, Content Editor, Publisher
 *   - publish / unpublish / archive / restore → Super Admin, Publisher
 *
 * The `memberships.*` keys are the logical permissions the spec names; they map onto the seeded
 * generic `content.*` set (auth.permissions.ts), so this new module is covered WITHOUT re-seeding
 * RBAC (development-rules §3). Bulk upload reuses the create grant.
 */
export const MEMBERSHIP_PERMISSIONS = {
  view: 'memberships.view',
  create: 'memberships.create',
  update: 'memberships.update',
  publish: 'memberships.publish',
  archive: 'memberships.archive',
  restore: 'memberships.restore',
} as const;

export const MEMBERSHIP_PERMISSION_TO_CONTENT: Record<string, string> = {
  'memberships.view': 'masters.view',
  'memberships.create': 'content.create',
  'memberships.update': 'content.update',
  'memberships.publish': 'content.publish',
  'memberships.archive': 'content.archive',
  'memberships.restore': 'content.restore',
};
