/**
 * Named permission keys for the pages module (API spec §8).
 *
 * Pages are a publishable **P** content resource, so authorization reuses the project's shared
 * content RBAC exactly like tenders/documents/institutions:
 *   - create / update / view  → Super Admin, Content Editor, Publisher
 *   - publish / unpublish / archive / restore → Super Admin, Publisher
 *
 * The `pages.*` keys map onto the seeded generic `content.*` set (auth.permissions.ts), so the
 * new module is covered WITHOUT re-seeding RBAC (development-rules §3).
 */
export const PAGE_PERMISSIONS = {
  view: 'pages.view',
  create: 'pages.create',
  update: 'pages.update',
  publish: 'pages.publish',
  archive: 'pages.archive',
  restore: 'pages.restore',
} as const;

export const PAGE_PERMISSION_TO_CONTENT: Record<string, string> = {
  'pages.view': 'masters.view',
  'pages.create': 'content.create',
  'pages.update': 'content.update',
  'pages.publish': 'content.publish',
  'pages.archive': 'content.archive',
  'pages.restore': 'content.restore',
};
