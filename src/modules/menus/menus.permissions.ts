/**
 * Named permission keys for the menus module (API spec §6/§8).
 *
 * Menu items are navigation CONFIGURATION (not a publishable **P** content resource — they have no
 * publication lifecycle, only `is_active`). Authorization reuses the shared content RBAC:
 *   - view                         → Super Admin, Content Editor, Publisher
 *   - create / update / reorder    → Super Admin, Publisher, and Content Editor when granted
 *                                    (mapped to the seeded generic `content.create` / `content.update`)
 *   - delete                       → Super Admin ONLY (API spec §6: "Only Super Admin may delete";
 *                                    deletion cascades child rows, so the request must confirm)
 *
 * No RBAC schema change — the `menus.*` keys map onto the seeded `content.*` set.
 */
export const MENU_PERMISSIONS = {
  view: 'menus.view',
  create: 'menus.create',
  update: 'menus.update',
  delete: 'menus.delete',
} as const;

export const MENU_PERMISSION_TO_CONTENT: Record<string, string> = {
  'menus.view': 'masters.view',
  'menus.create': 'content.create',
  'menus.update': 'content.update',
};
