/**
 * Galleries feature (Phase 15.7 remediation — Issue 1). Full admin frontend for the Gallery module —
 * list, create/edit, detail, lifecycle, and complete image management (add/remove/reorder/caption/
 * alt-text/order) — built on the shared 15.0/15.1 infrastructure and the backend gallery endpoints
 * (codex §5.2). Galleries reference reusable Media Library assets; images are never copied.
 */
export { GalleryListPage } from './gallery-list-page';
export { GalleryFormPage } from './gallery-form-page';
export { GalleryDetailPage } from './gallery-detail-page';
export { GALLERIES_RESOURCE } from './api';
export * from './types';
