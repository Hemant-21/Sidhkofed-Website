/**
 * Named permission keys for the programmes module (API spec §8). Programmes are a publishable
 * **P** content resource; authorization reuses the shared content RBAC (maps onto the seeded
 * `content.*` set), exactly like institutions/documents. No RBAC schema change.
 */
export const PROGRAMME_PERMISSIONS = {
  view: 'programmes.view',
  create: 'programmes.create',
  update: 'programmes.update',
  publish: 'programmes.publish',
  archive: 'programmes.archive',
  restore: 'programmes.restore',
} as const;

export const PROGRAMME_PERMISSION_TO_CONTENT: Record<string, string> = {
  'programmes.view': 'masters.view',
  'programmes.create': 'content.create',
  'programmes.update': 'content.update',
  'programmes.publish': 'content.publish',
  'programmes.archive': 'content.archive',
  'programmes.restore': 'content.restore',
};
