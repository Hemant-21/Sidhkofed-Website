/**
 * Permission keys for Toolkits. Like programmes, the backend authorizes toolkits with
 * MODULE-SPECIFIC keys (`toolkits.create`, `toolkits.publish`, …) and the nested catalogue items
 * with `toolkit_items.*` CRUD keys — see toolkits.routes.ts + auth.permissions.ts, which seed them
 * and grant them to Content Editor (view/create/update on toolkit + full item CRUD) and Publisher
 * (view/update + lifecycle on toolkit + full item CRUD).
 *
 * These keys only mirror the backend seed; the backend remains the security boundary. They drive
 * permission-aware affordances via <Can>/usePermissions.
 */

import { modulePermissions } from '@/constants/permissions';

export const TOOLKIT_PERMS = modulePermissions('toolkits');

export const TOOLKIT_ITEM_PERMS = {
  view: 'toolkit_items.view',
  create: 'toolkit_items.create',
  update: 'toolkit_items.update',
  delete: 'toolkit_items.delete',
} as const;
