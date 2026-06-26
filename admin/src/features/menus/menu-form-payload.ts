/**
 * Pure form ↔ API mapping for the menu-item form (unit-testable; no React). A menu item links EITHER
 * an internal page (`link_type='page'` → `page_id`) OR an explicit url (`link_type='url'` → `url`,
 * an internal path or external http(s) URL). The unused side is sent as null so switching link types
 * clears the other. Empty parent / display order map to null / undefined. No server-managed fields.
 */

import type { MenuItem, MenuItemWriteInput, MenuLocation } from './types';

export type MenuLinkType = 'page' | 'url';

export interface MenuItemFormValues {
  label_en: string;
  label_hi: string;
  location: MenuLocation;
  link_type: MenuLinkType;
  page_id: string | null;
  url: string;
  parent_id: string;
  opens_new_tab: boolean;
  is_active: boolean;
  display_order: string;
}

const blank = (v: string): string | null => (v.trim() === '' ? null : v.trim());

export function emptyMenuItemForm(location: MenuLocation = 'header'): MenuItemFormValues {
  return {
    label_en: '',
    label_hi: '',
    location,
    link_type: 'page',
    page_id: null,
    url: '',
    parent_id: '',
    opens_new_tab: false,
    is_active: true,
    display_order: '',
  };
}

export function menuItemToForm(m: MenuItem): MenuItemFormValues {
  const linkType: MenuLinkType = m.page ? 'page' : 'url';
  return {
    label_en: m.label_en,
    label_hi: m.label_hi ?? '',
    location: m.location,
    link_type: linkType,
    page_id: m.page?.id ?? null,
    url: m.url ?? '',
    parent_id: m.parent_id ?? '',
    opens_new_tab: m.opens_new_tab,
    is_active: m.is_active,
    display_order: String(m.display_order ?? 0),
  };
}

export function buildMenuItemPayload(v: MenuItemFormValues): MenuItemWriteInput {
  const usePage = v.link_type === 'page';
  const payload: MenuItemWriteInput = {
    label_en: v.label_en.trim(),
    label_hi: blank(v.label_hi),
    location: v.location,
    page_id: usePage ? v.page_id : null,
    url: usePage ? null : blank(v.url),
    parent_id: blank(v.parent_id),
    opens_new_tab: v.opens_new_tab,
    is_active: v.is_active,
  };
  if (v.display_order.trim() !== '') payload.display_order = Number(v.display_order);
  return payload;
}
