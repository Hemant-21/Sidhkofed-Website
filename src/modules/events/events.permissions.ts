/**
 * Named permission keys for the events + derived-news modules (API spec §8). Events/news are
 * publishable **P** content resources; authorization reuses the shared content RBAC (maps onto the
 * seeded `content.*` set). Event field-definitions are Super Admin only (the wildcard super-admin
 * role covers them without a dedicated grant). No RBAC schema change (development-rules §3).
 */
export const EVENT_PERMISSIONS = {
  view: 'events.view',
  create: 'events.create',
  update: 'events.update',
  publish: 'events.publish',
  archive: 'events.archive',
  restore: 'events.restore',
  // Derived news + completion/cancellation are publisher-level lifecycle actions.
  publishAsNews: 'events.publish_as_news',
  complete: 'events.complete',
  cancel: 'events.cancel',
  // Controlled-field schema — Super Admin only.
  manageFieldDefinitions: 'events.field_definitions.manage',
} as const;

export const EVENT_PERMISSION_TO_CONTENT: Record<string, string> = {
  'events.view': 'masters.view',
  'events.create': 'content.create',
  'events.update': 'content.update',
  'events.publish': 'content.publish',
  'events.archive': 'content.archive',
  'events.restore': 'content.restore',
};
