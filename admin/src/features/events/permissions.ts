/**
 * Permission keys for Events & News. The backend authorizes these modules with the SHARED
 * `content.*` permission set (events.routes.ts / news.routes.ts) — NOT `events.*`. complete /
 * cancel are publisher-level role actions; publish-as-news requires `content.publish`.
 *
 * These keys only mirror the backend seed (auth.permissions.ts); the backend remains the
 * security boundary. They drive permission-aware affordances via <Can>/usePermissions.
 */

import { ROLE_KEYS } from '@/constants/permissions';

export const CONTENT_PERMS = {
  create: 'content.create',
  update: 'content.update',
  publish: 'content.publish',
  unpublish: 'content.unpublish',
  archive: 'content.archive',
  restore: 'content.restore',
} as const;

/** Roles allowed to complete/cancel an event (Super Admin + Publisher). */
export const EVENT_ACTION_ROLES: string[] = [ROLE_KEYS.superAdmin, ROLE_KEYS.publisher];
