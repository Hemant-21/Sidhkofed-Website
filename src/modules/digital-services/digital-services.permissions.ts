/**
 * Named permission keys for the digital-services module (API spec §8).
 *
 * Digital Services are a publishable **P** content resource, so authorization reuses the project's
 * shared content RBAC exactly like tenders/pages/faqs:
 *   - create / update / view  → Super Admin, Content Editor, Publisher
 *   - publish / unpublish / archive / restore → Super Admin, Publisher
 *
 * The `digital_services.*` keys map onto the seeded generic `content.*` set (auth.permissions.ts),
 * so the new module is covered WITHOUT re-seeding RBAC (development-rules §3).
 */
export const DIGITAL_SERVICE_PERMISSIONS = {
  view: 'digital_services.view',
  create: 'digital_services.create',
  update: 'digital_services.update',
  publish: 'digital_services.publish',
  archive: 'digital_services.archive',
  restore: 'digital_services.restore',
} as const;

export const DIGITAL_SERVICE_PERMISSION_TO_CONTENT: Record<string, string> = {
  'digital_services.view': 'masters.view',
  'digital_services.create': 'content.create',
  'digital_services.update': 'content.update',
  'digital_services.publish': 'content.publish',
  'digital_services.archive': 'content.archive',
  'digital_services.restore': 'content.restore',
};
