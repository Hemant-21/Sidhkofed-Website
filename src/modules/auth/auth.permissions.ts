/**
 * RBAC catalog — the canonical role keys, permission keys, and default role→permission
 * mapping seeded in Phase 2 (TASK 13). Single source of truth shared by the seeder and
 * the app so role/permission names never drift.
 *
 * Permission keys follow the project standard `module.action` (coding-standards §1) and
 * map 1:1 onto the approved `permissions` table (`key` unique, `(module, action)` unique).
 * The named set mirrors the role capabilities in the CMS requirements §7
 * (create/update/publish/unpublish/archive/restore + manage users/settings).
 */

/** Seeded role keys (database-schema-design.md Part 5). */
export const ROLE_KEYS = {
  superAdmin: 'super_admin',
  contentEditor: 'content_editor',
  publisher: 'publisher',
} as const;

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

export interface RoleSeed {
  key: RoleKey;
  nameEn: string;
  description: string;
}

/** The three seeded roles (CMS requirements §7). All are system roles (non-deletable). */
export const ROLES: RoleSeed[] = [
  { key: ROLE_KEYS.superAdmin, nameEn: 'Super Admin', description: 'Full access to all modules, users, masters, and settings.' },
  { key: ROLE_KEYS.contentEditor, nameEn: 'Content Editor', description: 'Create and edit draft content. Cannot publish, archive, or manage the system.' },
  { key: ROLE_KEYS.publisher, nameEn: 'Publisher', description: 'Publish, unpublish, archive, and restore content; edit where granted.' },
];

export interface PermissionSeed {
  key: string;
  module: string;
  action: string;
  description: string;
}

/**
 * Permission catalog. `content.*` are the publishing-lifecycle actions every content
 * module shares; `users.manage`/`settings.manage` are the administration grants
 * (requirements §7 "manage users" / "manage settings").
 */
export const PERMISSIONS: PermissionSeed[] = [
  { key: 'content.create', module: 'content', action: 'create', description: 'Create draft content.' },
  { key: 'content.update', module: 'content', action: 'update', description: 'Edit content.' },
  { key: 'content.publish', module: 'content', action: 'publish', description: 'Publish content.' },
  { key: 'content.unpublish', module: 'content', action: 'unpublish', description: 'Unpublish content.' },
  { key: 'content.archive', module: 'content', action: 'archive', description: 'Archive content.' },
  { key: 'content.restore', module: 'content', action: 'restore', description: 'Restore archived content.' },
  { key: 'users.manage', module: 'users', action: 'manage', description: 'Manage user accounts and role assignments.' },
  { key: 'settings.manage', module: 'settings', action: 'manage', description: 'Manage system settings.' },
  // Master data (Phase 4 — API spec §4/§8). Reads are dropdown access for every CMS role;
  // writes/activation are Super Admin only (the wildcard role covers them without a grant).
  { key: 'masters.view', module: 'masters', action: 'view', description: 'Read master data (dropdown access).' },
  { key: 'masters.create', module: 'masters', action: 'create', description: 'Create master records.' },
  { key: 'masters.update', module: 'masters', action: 'update', description: 'Edit master records.' },
  { key: 'masters.activate', module: 'masters', action: 'activate', description: 'Activate master records.' },
  { key: 'masters.deactivate', module: 'masters', action: 'deactivate', description: 'Deactivate master records.' },
  { key: 'masters.restore', module: 'masters', action: 'restore', description: 'Restore (re-activate) master records.' },
];

/**
 * Default permission keys per role. `super_admin` is intentionally absent here — it is
 * seeded with EVERY permission and is also treated as an allow-all wildcard in code, so
 * new modules are covered without re-seeding.
 */
export const ROLE_PERMISSIONS: Record<Exclude<RoleKey, 'super_admin'>, string[]> = {
  content_editor: ['content.create', 'content.update', 'masters.view'],
  publisher: ['content.publish', 'content.unpublish', 'content.archive', 'content.restore', 'content.update', 'masters.view'],
};
