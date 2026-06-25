/**
 * Named permission keys for the official-communications module (API spec §8).
 *
 * Official Communications are a publishable **P** content resource, so authorization reuses the
 * project's shared content RBAC exactly like documents/institutions:
 *   - create / update / view  → Super Admin, Content Editor, Publisher
 *   - publish / unpublish / archive / restore → Super Admin, Publisher
 *
 * The `official-communications.*` keys are the logical permissions the spec names; they map onto the
 * seeded generic `content.*` set (auth.permissions.ts), so a new content module is covered WITHOUT
 * re-seeding RBAC (development-rules §3). Exported for documentation/clarity.
 */
export const OFFICIAL_COMMUNICATION_PERMISSIONS = {
  view: 'official-communications.view',
  create: 'official-communications.create',
  update: 'official-communications.update',
  publish: 'official-communications.publish',
  archive: 'official-communications.archive',
  restore: 'official-communications.restore',
} as const;

export const OFFICIAL_COMMUNICATION_PERMISSION_TO_CONTENT: Record<string, string> = {
  'official-communications.view': 'masters.view',
  'official-communications.create': 'content.create',
  'official-communications.update': 'content.update',
  'official-communications.publish': 'content.publish',
  'official-communications.archive': 'content.archive',
  'official-communications.restore': 'content.restore',
};
