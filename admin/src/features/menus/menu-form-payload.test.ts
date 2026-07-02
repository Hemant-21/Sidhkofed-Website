import { describe, expect, it } from 'vitest';
import { buildMenuItemPayload, emptyMenuItemForm, type MenuItemFormValues } from './menu-form-payload';

/**
 * Payload regression (Phase 15.7). Must match the backend `menuItemCreateSchema`
 * (menus.validators.ts): label/location plus EITHER url OR page_id, parent, opens_new_tab,
 * is_active, optional display_order. Switching link type clears the unused destination side.
 */
function values(overrides: Partial<MenuItemFormValues> = {}): MenuItemFormValues {
  return { ...emptyMenuItemForm('header'), label_en: 'About', ...overrides };
}

describe('buildMenuItemPayload', () => {
  it('sends page_id and nulls url when linking an internal page', () => {
    const p = buildMenuItemPayload(values({ link_type: 'page', page_id: 'pg-1', url: 'ignored' }));
    expect(p.page_id).toBe('pg-1');
    expect(p.url).toBeNull();
  });

  it('sends url and nulls page_id when linking a url', () => {
    const p = buildMenuItemPayload(values({ link_type: 'url', url: '/about', page_id: 'pg-1' }));
    expect(p.url).toBe('/about');
    expect(p.page_id).toBeNull();
  });

  it('maps empty parent to null and omits display_order when blank', () => {
    const p = buildMenuItemPayload(values({ parent_id: '', display_order: '' }));
    expect(p.parent_id).toBeNull();
    expect(p).not.toHaveProperty('display_order');
  });

  it('includes display_order when provided', () => {
    expect(buildMenuItemPayload(values({ display_order: '2' })).display_order).toBe(2);
  });

  it('trims label and carries flags', () => {
    const p = buildMenuItemPayload(values({ label_en: '  About  ', opens_new_tab: true, is_active: false }));
    expect(p.label_en).toBe('About');
    expect(p.opens_new_tab).toBe(true);
    expect(p.is_active).toBe(false);
  });

  it('never produces server-managed fields', () => {
    const p = buildMenuItemPayload(values()) as Record<string, unknown>;
    expect(p.id).toBeUndefined();
    expect(p.created_by).toBeUndefined();
  });
});
