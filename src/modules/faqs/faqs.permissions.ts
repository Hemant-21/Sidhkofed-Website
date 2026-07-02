/**
 * Named permission keys for the FAQs module (API spec §8).
 *
 * FAQs are a publishable **P** content resource, so authorization reuses the project's shared
 * content RBAC exactly like tenders/pages:
 *   - create / update / view  → Super Admin, Content Editor, Publisher
 *   - publish / unpublish / archive / restore → Super Admin, Publisher
 *
 * The `faqs.*` keys map onto the seeded generic `content.*` set (auth.permissions.ts), so the new
 * module is covered WITHOUT re-seeding RBAC (development-rules §3).
 */
export const FAQ_PERMISSIONS = {
  view: 'faqs.view',
  create: 'faqs.create',
  update: 'faqs.update',
  publish: 'faqs.publish',
  archive: 'faqs.archive',
  restore: 'faqs.restore',
} as const;

export const FAQ_PERMISSION_TO_CONTENT: Record<string, string> = {
  'faqs.view': 'masters.view',
  'faqs.create': 'content.create',
  'faqs.update': 'content.update',
  'faqs.publish': 'content.publish',
  'faqs.archive': 'content.archive',
  'faqs.restore': 'content.restore',
};
