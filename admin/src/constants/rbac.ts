/**
 * RBAC reference catalog (read-only).
 *
 * The backend exposes NO role/permission management endpoint (the routes mounted in
 * `src/routes/index.ts` are auth + settings + audit-logs + content modules only). Roles and
 * permissions are SEED-ONLY data, defined canonically in the backend seeder
 * `src/modules/auth/auth.permissions.ts`. This file is a faithful, 1:1 mirror of that seeder so the
 * Role & Permission admin surface can render the real RBAC model WITHOUT inventing an API.
 *
 * It defines NOTHING and grants NOTHING — the backend remains the single source of truth and the
 * security boundary. The data is presented strictly read-only: there is no create/edit/delete
 * because no contract exists for it (task: "Never invent APIs").
 *
 * If a `/admin/roles` + `/admin/permissions` contract is ever added, replace these constants with a
 * live query; the Role pages already consume this through one module (features/roles) so the swap is
 * localized.
 */

import { ROLE_KEYS } from '@/constants/permissions';

/** A seeded role (mirrors auth.permissions.ts → ROLES). `super_admin` is the allow-all wildcard. */
export interface RbacRole {
  key: string;
  name_en: string;
  description: string;
  /** All three seeded roles are system roles (non-deletable). */
  is_system: boolean;
}

export const RBAC_ROLES: RbacRole[] = [
  {
    key: ROLE_KEYS.superAdmin,
    name_en: 'Super Admin',
    description: 'Full access to all modules, users, masters, and settings.',
    is_system: true,
  },
  {
    key: ROLE_KEYS.contentEditor,
    name_en: 'Content Editor',
    description: 'Create and edit draft content. Cannot publish, archive, or manage the system.',
    is_system: true,
  },
  {
    key: ROLE_KEYS.publisher,
    name_en: 'Publisher',
    description: 'Publish, unpublish, archive, and restore content; edit where granted.',
    is_system: true,
  },
];

/** A seeded permission (mirrors auth.permissions.ts → PERMISSIONS). */
export interface RbacPermission {
  key: string;
  module: string;
  action: string;
  description: string;
}

/** Lifecycle permissions for a publishable content module (auth.permissions.ts helper). */
function contentPerms(module: string, label: string): RbacPermission[] {
  return [
    ['view', `Read ${label} records.`],
    ['create', `Create draft ${label} records.`],
    ['update', `Edit ${label} records.`],
    ['publish', `Publish ${label} records.`],
    ['unpublish', `Unpublish ${label} records.`],
    ['archive', `Archive ${label} records.`],
    ['restore', `Restore archived ${label} records.`],
  ].map(([action, description]) => ({ key: `${module}.${action}`, module, action: action!, description: description! }));
}

/** View/create/update/delete permissions for a nested (non-publishable) resource. */
function crudPerms(module: string, label: string): RbacPermission[] {
  return [
    ['view', `Read ${label} records.`],
    ['create', `Create ${label} records.`],
    ['update', `Edit ${label} records.`],
    ['delete', `Delete ${label} records.`],
  ].map(([action, description]) => ({ key: `${module}.${action}`, module, action: action!, description: description! }));
}

/**
 * The full permission catalog — an exact mirror of the backend seeder's `PERMISSIONS` array. Most
 * content modules share the generic `content.*` lifecycle set; the Phase-7 modules and the dashboard
 * carry module-specific keys, exactly as seeded.
 */
export const RBAC_PERMISSIONS: RbacPermission[] = [
  { key: 'content.create', module: 'content', action: 'create', description: 'Create draft content.' },
  { key: 'content.update', module: 'content', action: 'update', description: 'Edit content.' },
  { key: 'content.publish', module: 'content', action: 'publish', description: 'Publish content.' },
  { key: 'content.unpublish', module: 'content', action: 'unpublish', description: 'Unpublish content.' },
  { key: 'content.archive', module: 'content', action: 'archive', description: 'Archive content.' },
  { key: 'content.restore', module: 'content', action: 'restore', description: 'Restore archived content.' },
  { key: 'users.manage', module: 'users', action: 'manage', description: 'Manage user accounts and role assignments.' },
  { key: 'settings.manage', module: 'settings', action: 'manage', description: 'Manage system settings.' },
  { key: 'masters.view', module: 'masters', action: 'view', description: 'Read master data (dropdown access).' },
  { key: 'masters.create', module: 'masters', action: 'create', description: 'Create master records.' },
  { key: 'masters.update', module: 'masters', action: 'update', description: 'Edit master records.' },
  { key: 'masters.activate', module: 'masters', action: 'activate', description: 'Activate master records.' },
  { key: 'masters.deactivate', module: 'masters', action: 'deactivate', description: 'Deactivate master records.' },
  { key: 'masters.restore', module: 'masters', action: 'restore', description: 'Restore (re-activate) master records.' },
  ...contentPerms('programmes', 'Programme'),
  ...contentPerms('toolkits', 'Toolkit'),
  ...crudPerms('toolkit_items', 'Toolkit item'),
  ...crudPerms('toolkit_distributions', 'Toolkit distribution summary'),
  { key: 'dashboard.publish', module: 'dashboard', action: 'publish', description: 'Publish dashboard reports.' },
  { key: 'dashboard.unpublish', module: 'dashboard', action: 'unpublish', description: 'Unpublish dashboard reports.' },
  { key: 'dashboard.archive', module: 'dashboard', action: 'archive', description: 'Archive dashboard reports.' },
  { key: 'dashboard.restore', module: 'dashboard', action: 'restore', description: 'Restore archived dashboard reports.' },
  { key: 'dashboard.manage_data', module: 'dashboard', action: 'manage_data', description: 'Manage dashboard metrics and import datasets.' },
];

/**
 * Default permission keys per role — a mirror of the seeder's `ROLE_PERMISSIONS` (plus the
 * Phase-7 module grants). `super_admin` is intentionally a wildcard: it holds EVERY permission, so
 * it is represented as `'*'` and resolved by {@link rolePermissionKeys}.
 */
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

export const RBAC_ROLE_PERMISSIONS: Record<string, string[]> = {
  [ROLE_KEYS.superAdmin]: ['*'],
  [ROLE_KEYS.contentEditor]: ['content.create', 'content.update', 'masters.view', ...EDITOR_MODULE_GRANTS],
  [ROLE_KEYS.publisher]: [
    'content.publish', 'content.unpublish', 'content.archive', 'content.restore', 'content.update', 'masters.view',
    'dashboard.publish', 'dashboard.unpublish', 'dashboard.archive', 'dashboard.restore', 'dashboard.manage_data',
    ...PUBLISHER_MODULE_GRANTS,
  ],
};

/** Resolve a role's effective permission keys (Super Admin is wildcard → every catalog key). */
export function rolePermissionKeys(roleKey: string): Set<string> {
  const grants = RBAC_ROLE_PERMISSIONS[roleKey] ?? [];
  if (grants.includes('*')) return new Set(RBAC_PERMISSIONS.map((p) => p.key));
  return new Set(grants);
}

/** Ordered module list for grouping the permission matrix (stable display order). */
export const RBAC_MODULE_ORDER = [
  'content',
  'programmes',
  'toolkits',
  'toolkit_items',
  'toolkit_distributions',
  'dashboard',
  'masters',
  'users',
  'settings',
] as const;

/** Permissions grouped by module, in {@link RBAC_MODULE_ORDER}, for the matrix view. */
export function permissionsByModule(): Array<{ module: string; permissions: RbacPermission[] }> {
  const byModule = new Map<string, RbacPermission[]>();
  for (const perm of RBAC_PERMISSIONS) {
    (byModule.get(perm.module) ?? byModule.set(perm.module, []).get(perm.module)!).push(perm);
  }
  const ordered: Array<{ module: string; permissions: RbacPermission[] }> = [];
  for (const module of RBAC_MODULE_ORDER) {
    const permissions = byModule.get(module);
    if (permissions) ordered.push({ module, permissions });
  }
  // Any module not in the explicit order (future-proof) appended alphabetically.
  for (const [module, permissions] of [...byModule.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (!RBAC_MODULE_ORDER.includes(module as (typeof RBAC_MODULE_ORDER)[number])) {
      ordered.push({ module, permissions });
    }
  }
  return ordered;
}

/** Find one role by key. */
export function findRbacRole(key: string): RbacRole | undefined {
  return RBAC_ROLES.find((r) => r.key === key);
}
