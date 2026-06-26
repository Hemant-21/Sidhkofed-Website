/**
 * Roles & Permissions types — static RBAC reference mirroring the backend seeder
 * (auth.permissions.ts). No API endpoint exists for roles; these constants are
 * derived directly from the backend source of truth and kept in sync manually.
 *
 * Super Admin is an implicit wildcard role (all permissions granted). The matrix
 * marks it as full-access without enumerating individual grants.
 */

import { ROLE_KEYS } from '@/constants/permissions';

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

export interface RoleDefinition {
  key: RoleKey;
  name: string;
  description: string;
  isWildcard?: boolean;
}

export interface PermissionDefinition {
  key: string;
  module: string;
  action: string;
  description: string;
}

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    key: ROLE_KEYS.superAdmin,
    name: 'Super Admin',
    description: 'Full access to all modules, users, masters, and settings.',
    isWildcard: true,
  },
  {
    key: ROLE_KEYS.publisher,
    name: 'Publisher',
    description: 'Publish, unpublish, archive, and restore content; edit where granted.',
  },
  {
    key: ROLE_KEYS.contentEditor,
    name: 'Content Editor',
    description: 'Create and edit draft content. Cannot publish, archive, or manage the system.',
  },
];

/** Flat permission definitions (mirrors backend PERMISSIONS array). */
export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
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
  { key: 'masters.restore', module: 'masters', action: 'restore', description: 'Restore master records.' },
  { key: 'programmes.view', module: 'programmes', action: 'view', description: 'Read Programme records.' },
  { key: 'programmes.create', module: 'programmes', action: 'create', description: 'Create draft Programme records.' },
  { key: 'programmes.update', module: 'programmes', action: 'update', description: 'Edit Programme records.' },
  { key: 'programmes.publish', module: 'programmes', action: 'publish', description: 'Publish Programme records.' },
  { key: 'programmes.unpublish', module: 'programmes', action: 'unpublish', description: 'Unpublish Programme records.' },
  { key: 'programmes.archive', module: 'programmes', action: 'archive', description: 'Archive Programme records.' },
  { key: 'programmes.restore', module: 'programmes', action: 'restore', description: 'Restore archived Programme records.' },
  { key: 'toolkits.view', module: 'toolkits', action: 'view', description: 'Read Toolkit records.' },
  { key: 'toolkits.create', module: 'toolkits', action: 'create', description: 'Create draft Toolkit records.' },
  { key: 'toolkits.update', module: 'toolkits', action: 'update', description: 'Edit Toolkit records.' },
  { key: 'toolkits.publish', module: 'toolkits', action: 'publish', description: 'Publish Toolkit records.' },
  { key: 'toolkits.unpublish', module: 'toolkits', action: 'unpublish', description: 'Unpublish Toolkit records.' },
  { key: 'toolkits.archive', module: 'toolkits', action: 'archive', description: 'Archive Toolkit records.' },
  { key: 'toolkits.restore', module: 'toolkits', action: 'restore', description: 'Restore archived Toolkit records.' },
  { key: 'toolkit_items.view', module: 'toolkit_items', action: 'view', description: 'Read Toolkit item records.' },
  { key: 'toolkit_items.create', module: 'toolkit_items', action: 'create', description: 'Create Toolkit item records.' },
  { key: 'toolkit_items.update', module: 'toolkit_items', action: 'update', description: 'Edit Toolkit item records.' },
  { key: 'toolkit_items.delete', module: 'toolkit_items', action: 'delete', description: 'Delete Toolkit item records.' },
  { key: 'toolkit_distributions.view', module: 'toolkit_distributions', action: 'view', description: 'Read Toolkit distribution summary records.' },
  { key: 'toolkit_distributions.create', module: 'toolkit_distributions', action: 'create', description: 'Create Toolkit distribution summary records.' },
  { key: 'toolkit_distributions.update', module: 'toolkit_distributions', action: 'update', description: 'Edit Toolkit distribution summary records.' },
  { key: 'toolkit_distributions.delete', module: 'toolkit_distributions', action: 'delete', description: 'Delete Toolkit distribution summary records.' },
  { key: 'dashboard.publish', module: 'dashboard', action: 'publish', description: 'Publish dashboard reports.' },
  { key: 'dashboard.unpublish', module: 'dashboard', action: 'unpublish', description: 'Unpublish dashboard reports.' },
  { key: 'dashboard.archive', module: 'dashboard', action: 'archive', description: 'Archive dashboard reports.' },
  { key: 'dashboard.restore', module: 'dashboard', action: 'restore', description: 'Restore archived dashboard reports.' },
  { key: 'dashboard.manage_data', module: 'dashboard', action: 'manage_data', description: 'Manage dashboard metrics and import datasets.' },
];

/** Default permission grants per non-wildcard role (mirrors backend ROLE_PERMISSIONS). */
export const ROLE_PERMISSION_MAP: Record<Exclude<RoleKey, 'super_admin'>, Set<string>> = {
  content_editor: new Set([
    'content.create', 'content.update', 'masters.view',
    'programmes.view', 'programmes.create', 'programmes.update',
    'toolkits.view', 'toolkits.create', 'toolkits.update',
    'toolkit_items.view', 'toolkit_items.create', 'toolkit_items.update', 'toolkit_items.delete',
    'toolkit_distributions.view', 'toolkit_distributions.create', 'toolkit_distributions.update', 'toolkit_distributions.delete',
  ]),
  publisher: new Set([
    'content.publish', 'content.unpublish', 'content.archive', 'content.restore', 'content.update', 'masters.view',
    'dashboard.publish', 'dashboard.unpublish', 'dashboard.archive', 'dashboard.restore', 'dashboard.manage_data',
    'programmes.view', 'programmes.update', 'programmes.publish', 'programmes.unpublish', 'programmes.archive', 'programmes.restore',
    'toolkits.view', 'toolkits.update', 'toolkits.publish', 'toolkits.unpublish', 'toolkits.archive', 'toolkits.restore',
    'toolkit_items.view', 'toolkit_items.create', 'toolkit_items.update', 'toolkit_items.delete',
    'toolkit_distributions.view', 'toolkit_distributions.create', 'toolkit_distributions.update', 'toolkit_distributions.delete',
  ]),
};

/** Module display labels (for grouping in the matrix). */
export const MODULE_LABELS: Record<string, string> = {
  content: 'Content (generic)',
  users: 'Users',
  settings: 'Settings',
  masters: 'Master data',
  programmes: 'Programmes',
  toolkits: 'Toolkits',
  toolkit_items: 'Toolkit items',
  toolkit_distributions: 'Toolkit distributions',
  dashboard: 'Dashboard',
};

/** Canonical module display order for the matrix. */
export const MODULE_ORDER = [
  'content',
  'programmes',
  'toolkits',
  'toolkit_items',
  'toolkit_distributions',
  'dashboard',
  'masters',
  'users',
  'settings',
];
