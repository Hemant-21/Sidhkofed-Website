/**
 * Permission KEY helpers.
 *
 * IMPORTANT (codex §7 / task): the frontend defines **no** authority. The backend
 * is the single source of truth; the user's effective permissions arrive as a flat
 * string array on `AuthUser.permissions` (e.g. `events.create`). These helpers only
 * BUILD the `module.action` strings we check against that array — they grant
 * nothing. This keeps checks type-safe and DRY without re-defining permissions.
 */

/** Canonical lifecycle/action verbs used across modules (mirrors backend keys). */
export const ACTIONS = {
  view: 'view',
  create: 'create',
  update: 'update',
  delete: 'delete',
  publish: 'publish',
  unpublish: 'unpublish',
  archive: 'archive',
  restore: 'restore',
} as const;

export type PermissionAction = (typeof ACTIONS)[keyof typeof ACTIONS] | (string & {});

/** Build a `module.action` permission key, e.g. `permission('events','publish')`. */
export function permission(module: string, action: PermissionAction): string {
  return `${module}.${action}`;
}

/**
 * Convenience builder for a module's full lifecycle key-set. A future module page
 * does `const P = modulePermissions('events')` then checks `P.publish` etc.
 */
export function modulePermissions(module: string) {
  return {
    view: permission(module, ACTIONS.view),
    create: permission(module, ACTIONS.create),
    update: permission(module, ACTIONS.update),
    delete: permission(module, ACTIONS.delete),
    publish: permission(module, ACTIONS.publish),
    unpublish: permission(module, ACTIONS.unpublish),
    archive: permission(module, ACTIONS.archive),
    restore: permission(module, ACTIONS.restore),
  };
}

/** Seeded role keys (API spec §1.2). Used only for display/labels, never authority. */
export const ROLE_KEYS = {
  superAdmin: 'super_admin',
  contentEditor: 'content_editor',
  publisher: 'publisher',
} as const;

/**
 * Backend permission keys reused by permission-aware affordances (dashboard quick
 * actions, etc.). These only MIRROR the seeded backend keys (auth.permissions.ts);
 * the backend still enforces every action. Most content modules share the generic
 * `content.*` lifecycle set; Phase-7 modules (programmes/toolkits) and the dashboard
 * carry module-specific keys.
 */
export const CONTENT_PERMISSIONS = {
  create: 'content.create',
  update: 'content.update',
  publish: 'content.publish',
} as const;

export const DASHBOARD_PERMISSIONS = {
  manageData: 'dashboard.manage_data',
  publish: 'dashboard.publish',
} as const;
