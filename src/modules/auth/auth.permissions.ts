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

/** Build the seven publishing-lifecycle permissions for a publishable content module. */
function moduleContentPermissions(module: string, label: string): PermissionSeed[] {
  const actions: Array<[string, string]> = [
    ['view', `Read ${label} records.`],
    ['create', `Create draft ${label} records.`],
    ['update', `Edit ${label} records.`],
    ['publish', `Publish ${label} records.`],
    ['unpublish', `Unpublish ${label} records.`],
    ['archive', `Archive ${label} records.`],
    ['restore', `Restore archived ${label} records.`],
  ];
  return actions.map(([action, description]) => ({ key: `${module}.${action}`, module, action, description }));
}

/** Build view/create/update/delete permissions for a nested (non-publishable) resource. */
function moduleCrudPermissions(module: string, label: string): PermissionSeed[] {
  const actions: Array<[string, string]> = [
    ['view', `Read ${label} records.`],
    ['create', `Create ${label} records.`],
    ['update', `Edit ${label} records.`],
    ['delete', `Delete ${label} records.`],
  ];
  return actions.map(([action, description]) => ({ key: `${module}.${action}`, module, action, description }));
}

/**
 * Permission catalog. `content.*` are the publishing-lifecycle actions the remaining content
 * modules share; the Phase-7 modules (programmes/toolkits/toolkit_items/toolkit_distributions)
 * carry their own module-specific keys (see below). `users.manage`/`settings.manage` are the
 * administration grants (requirements §7 "manage users" / "manage settings").
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
  // ── Phase 7 module-specific content permissions (API spec §1.2/§8 — "every protected
  // endpoint checks the named permission (events.create, …)"; the seeder creates a
  // module/action permission for each row). These four modules enforce their own named
  // keys instead of the generic `content.*` set. Super Admin still bypasses all checks.
  ...moduleContentPermissions('programmes', 'Programme'),
  ...moduleContentPermissions('toolkits', 'Toolkit'),
  // Nested resources have no publish lifecycle of their own (they follow the parent toolkit).
  ...moduleCrudPermissions('toolkit_items', 'Toolkit item'),
  ...moduleCrudPermissions('toolkit_distributions', 'Toolkit distribution summary'),
  // ── Phase 12 dashboard (API spec §8). Report definition/layout is Super Admin only at the route.
  // Report public LIFECYCLE uses dedicated `dashboard.*` keys (Publisher by default) instead of the
  // generic `content.*` set, so dashboard exposure can be granted independently of other content.
  // `dashboard.manage_data` gates the dashboard DATA surface (metric CRUD + dataset/Excel import);
  // Publisher holds it by default, a Content Editor needs an EXPLICIT grant, Super Admin is wildcard.
  { key: 'dashboard.publish', module: 'dashboard', action: 'publish', description: 'Publish dashboard reports.' },
  { key: 'dashboard.unpublish', module: 'dashboard', action: 'unpublish', description: 'Unpublish dashboard reports.' },
  { key: 'dashboard.archive', module: 'dashboard', action: 'archive', description: 'Archive dashboard reports.' },
  { key: 'dashboard.restore', module: 'dashboard', action: 'restore', description: 'Restore archived dashboard reports.' },
  { key: 'dashboard.manage_data', module: 'dashboard', action: 'manage_data', description: 'Manage dashboard metrics and import datasets.' },
];

/**
 * Default permission keys per role. `super_admin` is intentionally absent here — it is
 * seeded with EVERY permission and is also treated as an allow-all wildcard in code, so
 * new modules are covered without re-seeding.
 */
// Editors create/edit drafts (and manage nested draft-parent items/distributions);
// publishers run the publish lifecycle plus edits. Listed per Phase-7 module so the
// module-specific guards resolve exactly as the generic `content.*` baseline did.
const EDITOR_MODULE_GRANTS = [
  'programmes.view', 'programmes.create', 'programmes.update',
  'toolkits.view', 'toolkits.create', 'toolkits.update',
  'toolkit_items.view', 'toolkit_items.create', 'toolkit_items.update', 'toolkit_items.delete',
  'toolkit_distributions.view', 'toolkit_distributions.create', 'toolkit_distributions.update', 'toolkit_distributions.delete',
];
const PUBLISHER_MODULE_GRANTS = [
  'programmes.view', 'programmes.update', 'programmes.publish', 'programmes.unpublish', 'programmes.archive', 'programmes.restore',
  'toolkits.view', 'toolkits.update', 'toolkits.publish', 'toolkits.unpublish', 'toolkits.archive', 'toolkits.restore',
  'toolkit_items.view', 'toolkit_items.create', 'toolkit_items.update', 'toolkit_items.delete',
  'toolkit_distributions.view', 'toolkit_distributions.create', 'toolkit_distributions.update', 'toolkit_distributions.delete',
];

export const ROLE_PERMISSIONS: Record<Exclude<RoleKey, 'super_admin'>, string[]> = {
  content_editor: ['content.create', 'content.update', 'masters.view', ...EDITOR_MODULE_GRANTS],
  publisher: [
    'content.publish', 'content.unpublish', 'content.archive', 'content.restore', 'content.update', 'masters.view',
    'dashboard.publish', 'dashboard.unpublish', 'dashboard.archive', 'dashboard.restore', 'dashboard.manage_data',
    ...PUBLISHER_MODULE_GRANTS,
  ],
};
