/**
 * Named permission keys for the toolkits module (API spec §8). Toolkits are a publishable **P**
 * content resource; authorization reuses the shared content RBAC (maps onto the seeded `content.*`
 * set), exactly like programmes/institutions/documents. No RBAC schema change. The route layer
 * enforces these via the shared `content.*` grants (see toolkits.routes.ts).
 */
export const TOOLKIT_PERMISSIONS = {
  view: 'toolkits.view',
  create: 'toolkits.create',
  update: 'toolkits.update',
  publish: 'toolkits.publish',
  archive: 'toolkits.archive',
  restore: 'toolkits.restore',
} as const;

export const TOOLKIT_PERMISSION_TO_CONTENT: Record<string, string> = {
  'toolkits.view': 'masters.view',
  'toolkits.create': 'content.create',
  'toolkits.update': 'content.update',
  'toolkits.publish': 'content.publish',
  'toolkits.archive': 'content.archive',
  'toolkits.restore': 'content.restore',
};
