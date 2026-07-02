/**
 * Menu DTOs + mappers (API spec §5/§6).
 *
 * Admin: a flat menu-item representation (the editor builds the tree from parent_id + display_order).
 * Public: a nested ACTIVE tree per location — each node resolves a `url` (explicit url or the
 * referenced page route) and exposes a compact page reference. Public nodes never expose is_active,
 * created_by/updated_by, or timestamps.
 */
import type { MenuItemRow, PublicMenuItemRow } from './menus.repository';

const pageUrl = (slug: string): string => `/pages/${slug}`;
const iso = (d: Date): string => d.toISOString();

export interface PageRef {
  id: string;
  slug: string;
  title_en: string;
}

// ── Admin (flat) ────────────────────────────────────────────────────────────────
export interface MenuItemDto {
  id: string;
  label_en: string;
  label_hi: string | null;
  location: string;
  url: string | null;
  page: PageRef | null;
  parent_id: string | null;
  opens_new_tab: boolean;
  display_order: number;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export function toMenuItemDto(m: MenuItemRow): MenuItemDto {
  return {
    id: m.id,
    label_en: m.labelEn,
    label_hi: m.labelHi,
    location: m.location,
    url: m.url,
    page: m.page ? { id: m.page.id, slug: m.page.slug, title_en: m.page.titleEn } : null,
    parent_id: m.parentId,
    opens_new_tab: m.opensNewTab,
    display_order: m.displayOrder,
    is_active: m.isActive,
    created_by: m.createdById,
    updated_by: m.updatedById,
    created_at: iso(m.createdAt),
    updated_at: iso(m.updatedAt),
  };
}

// ── Public (nested tree) ──────────────────────────────────────────────────────
export interface PublicMenuItemDto {
  id: string;
  label_en: string;
  label_hi: string | null;
  url: string | null;
  page: PageRef | null;
  opens_new_tab: boolean;
  display_order: number;
  children: PublicMenuItemDto[];
}

/** Resolve the effective destination: an explicit url wins, else the referenced page route. */
function resolveUrl(m: PublicMenuItemRow): string | null {
  if (m.url) return m.url;
  if (m.page) return pageUrl(m.page.slug);
  return null;
}

export function toPublicMenuItemNode(m: PublicMenuItemRow, children: PublicMenuItemDto[]): PublicMenuItemDto {
  return {
    id: m.id,
    label_en: m.labelEn,
    label_hi: m.labelHi,
    url: resolveUrl(m),
    page: m.page ? { id: m.page.id, slug: m.page.slug, title_en: m.page.titleEn } : null,
    opens_new_tab: m.opensNewTab,
    display_order: m.displayOrder,
    children,
  };
}
