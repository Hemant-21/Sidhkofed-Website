/**
 * Named permission keys for the documents module (TASK 10 / API spec §8).
 *
 * Documents are a publishable **P** content resource, so authorization reuses the project's
 * shared content RBAC exactly like every other content module (events/news/galleries/videos):
 *   - create / update / view  → Super Admin, Content Editor, Publisher (role-gated)
 *   - publish / unpublish / archive / restore → Super Admin, Publisher (role-gated)
 *
 * The `documents.*` keys below are the canonical logical permissions the API spec §8 RBAC
 * matrix names for this module. They map onto the seeded generic `content.*` permission set
 * (auth.permissions.ts), which the foundation deliberately uses so a new content module is
 * covered WITHOUT re-seeding RBAC. They are exported for documentation/clarity and for any
 * future switch to per-module permission checks; the routes enforce the equivalent roles via
 * the existing `authorize()` middleware (no RBAC schema change — development-rules §3).
 */
export const DOCUMENT_PERMISSIONS = {
  view: 'documents.view',
  create: 'documents.create',
  update: 'documents.update',
  publish: 'documents.publish',
  archive: 'documents.archive',
  restore: 'documents.restore',
} as const;

/** Maps each logical document permission onto the seeded generic content permission. */
export const DOCUMENT_PERMISSION_TO_CONTENT: Record<string, string> = {
  'documents.view': 'masters.view', // read access (every CMS role has dropdown/read access)
  'documents.create': 'content.create',
  'documents.update': 'content.update',
  'documents.publish': 'content.publish',
  'documents.archive': 'content.archive',
  'documents.restore': 'content.restore',
};
