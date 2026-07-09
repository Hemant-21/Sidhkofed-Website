/**
 * Named permission keys for the leadership module (mirrors digital-services.permissions.ts).
 *
 * Leadership is a publishable **P** content resource, so authorization reuses the project's shared
 * content RBAC exactly like tenders/pages/faqs/digital-services:
 *   - create / update / view  → Super Admin, Content Editor, Publisher
 *   - publish / unpublish / archive / restore → Super Admin, Publisher
 *
 * The `leadership.*` keys map onto the seeded generic `content.*` set (auth.permissions.ts), so the
 * new module is covered WITHOUT re-seeding RBAC (development-rules §3).
 */
export const LEADERSHIP_PERMISSIONS = {
  view: 'leadership.view',
  create: 'leadership.create',
  update: 'leadership.update',
  publish: 'leadership.publish',
  archive: 'leadership.archive',
  restore: 'leadership.restore',
} as const;

export const LEADERSHIP_PERMISSION_TO_CONTENT: Record<string, string> = {
  'leadership.view': 'masters.view',
  'leadership.create': 'content.create',
  'leadership.update': 'content.update',
  'leadership.publish': 'content.publish',
  'leadership.archive': 'content.archive',
  'leadership.restore': 'content.restore',
};
