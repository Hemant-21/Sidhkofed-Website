'use client';

/**
 * Menus data layer. Menu items are NOT a standard "P" resource — the admin list is a flat,
 * unpaginated set, there is no publication lifecycle, and there are module-specific `reorder` and
 * confirm-gated `delete` endpoints. So this module composes the shared typed HTTP helpers directly
 * (no duplicate fetch logic) instead of the CRUD factory.
 *
 *   GET    /admin/menu-items?location=        → flat MenuItem[]
 *   GET    /admin/menu-items/{id}             → MenuItem
 *   POST   /admin/menu-items                  → MenuItem
 *   PATCH  /admin/menu-items/{id}             → MenuItem
 *   POST   /admin/menu-items/reorder          → MenuItem[]
 *   DELETE /admin/menu-items/{id}?confirm=true
 */

import { get, post, patch, del } from '@/lib/api/http';
import { withQuery } from '@/utils/query-string';
import type { MenuItem, MenuItemWriteInput, MenuLocation, MenuReorderInput } from './types';

export const MENU_RESOURCE = 'menu-items';
const BASE = '/admin/menu-items';

export { MENU_PERMS, MENU_DELETE_ROLES } from './permissions';

/** Flat list, optionally filtered to one location (the backend list is unpaginated). */
export const listMenuItems = (params?: { location?: MenuLocation; is_active?: boolean }) =>
  get<MenuItem[]>(withQuery(BASE, params));

export const getMenuItem = (id: string) => get<MenuItem>(`${BASE}/${encodeURIComponent(id)}`);

export const createMenuItem = (body: MenuItemWriteInput) => post<MenuItem, MenuItemWriteInput>(BASE, body);

export const updateMenuItem = (id: string, body: MenuItemWriteInput) =>
  patch<MenuItem, MenuItemWriteInput>(`${BASE}/${encodeURIComponent(id)}`, body);

export const reorderMenuItems = (body: MenuReorderInput) =>
  post<MenuItem[], MenuReorderInput>(`${BASE}/reorder`, body);

/** Delete cascades child rows — the backend requires explicit `confirm=true`. */
export const deleteMenuItem = (id: string) =>
  del<{ deleted: boolean }>(withQuery(`${BASE}/${encodeURIComponent(id)}`, { confirm: true }));
