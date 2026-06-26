/**
 * Menus module types — mirror of the backend DTOs and validators (menus.dto.ts / menus.validators.ts).
 * Simple menu configuration for header / footer / utility navigation (codex §4.11 / API spec §6).
 *
 * A menu item is a self-referencing tree node linking EITHER an internal page (`page_id`) OR an
 * explicit `url` (internal path or external http(s) URL). Menu items are navigation CONFIGURATION,
 * NOT publishable **P** content — they have no publication lifecycle, only an `is_active` flag.
 *
 * The HIERARCHY (parent_id + display_order) is OWNED by the backend; the frontend only renders it and
 * persists changes through the create/update/reorder endpoints. No custom tree persistence, no
 * client-side circular-reference validation (the backend enforces an acyclic tree).
 */

export const MENU_LOCATIONS = ['header', 'footer', 'utility'] as const;
export type MenuLocation = (typeof MENU_LOCATIONS)[number];

export const MENU_LOCATION_LABEL: Record<MenuLocation, string> = {
  header: 'Header',
  footer: 'Footer',
  utility: 'Utility',
};

/** Compact page reference returned for internal-page links. */
export interface MenuPageRef {
  id: string;
  slug: string;
  title_en: string;
}

/** Admin (flat) menu-item representation — the editor builds the tree from parent_id + display_order. */
export interface MenuItem {
  id: string;
  label_en: string;
  label_hi: string | null;
  location: MenuLocation;
  url: string | null;
  page: MenuPageRef | null;
  parent_id: string | null;
  opens_new_tab: boolean;
  display_order: number;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Write payload — model-backed fields the backend validator accepts (menus.validators.ts).
 * A create must carry EITHER `url` OR `page_id`. PATCH is partial; the destination invariant is
 * re-checked server-side against the merged record.
 */
export interface MenuItemWriteInput {
  label_en?: string;
  label_hi?: string | null;
  location?: MenuLocation;
  url?: string | null;
  page_id?: string | null;
  parent_id?: string | null;
  opens_new_tab?: boolean;
  display_order?: number;
  is_active?: boolean;
}

/** Reorder payload — a set of `{id, display_order}` rows persisted in one transaction. */
export interface MenuReorderInput {
  items: Array<{ id: string; display_order: number }>;
}
