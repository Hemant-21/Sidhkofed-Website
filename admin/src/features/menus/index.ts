/**
 * Menus feature (Phase 15.7). Full admin frontend for Menu Management — hierarchy view per location,
 * create/edit menu items, view, activate/deactivate, reorder (up/down → reorder API), and Super
 * Admin delete — built on the shared 15.0/15.1 infrastructure and backend contracts (codex §4.11).
 * The backend owns the hierarchy; the frontend never persists a custom tree.
 */
export { MenuListPage } from './menu-list-page';
export { MenuFormPage } from './menu-form-page';
export { MenuDetailPage } from './menu-detail-page';
export { MENU_RESOURCE } from './api';
export * from './types';
