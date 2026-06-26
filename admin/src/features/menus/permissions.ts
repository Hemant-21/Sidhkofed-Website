/**
 * Permission keys for Menu Management.
 *
 * Menu items are navigation CONFIGURATION authorized with the SHARED content RBAC (menus.routes.ts):
 *   - view                       → any authenticated CMS reader (role-gated route; no extra key)
 *   - create / update / reorder  → content.create / content.update (Editor when granted, Publisher,
 *                                  Super Admin)
 *   - delete                     → Super Admin ONLY (API spec §6: deletion cascades children and
 *                                  requires explicit confirm)
 *
 * We reuse the shared `content.*` catalog (the keys the backend actually grants) plus the Super Admin
 * role for delete. The backend remains the security boundary.
 */

import { ROLE_KEYS } from '@/constants/permissions';
import { CONTENT_PERMS } from '@/features/events/permissions';

export const MENU_PERMS = {
  create: CONTENT_PERMS.create,
  update: CONTENT_PERMS.update,
} as const;

/** Only Super Admin may delete a menu item (cascades child rows). */
export const MENU_DELETE_ROLES: string[] = [ROLE_KEYS.superAdmin];
