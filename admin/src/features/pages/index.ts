/**
 * Pages feature (Phase 15.7). Full admin frontend for the Pages module — list, create/edit, detail,
 * and lifecycle — built on the shared 15.0/15.1 infrastructure and backend contracts. One reusable
 * operation for static/institutional pages (codex §4.10). No page builder.
 */
export { PageListPage } from './page-list-page';
export { PageFormPage } from './page-form-page';
export { PageDetailPage } from './page-detail-page';
export { PAGES_RESOURCE } from './api';
export * from './types';
