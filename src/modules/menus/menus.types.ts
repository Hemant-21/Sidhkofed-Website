/**
 * Menus module shared types — the framework-free contract used by the controller, service, and
 * repository. Simple menu configuration for header / footer / utility navigation (CMS requirements
 * §4.11 / API spec §6). A menu item is a self-referencing tree node linking EITHER an internal page
 * OR an explicit url. The hierarchy must stay acyclic.
 */

/** Entity key used for the audit module name. */
export const MENU_ENTITY = 'menu_item';

/** The three supported menu locations (API spec §6). */
export const MENU_LOCATIONS = ['header', 'footer', 'utility'] as const;
export type MenuLocation = (typeof MENU_LOCATIONS)[number];

/** Admin list filters. */
export interface MenuItemFilters {
  location?: MenuLocation;
  isActive?: boolean;
}
