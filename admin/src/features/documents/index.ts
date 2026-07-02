/**
 * Documents feature (Phase 15.4). Full admin frontend for the Document Management Centre —
 * list, create/edit, detail, lifecycle, and version (replace-file) management — built entirely
 * on the shared 15.0/15.1 infrastructure and the backend contracts. Documents are uploaded once
 * and linked by reference (codex §4.5).
 */
export { DocumentListPage } from './document-list-page';
export { DocumentFormPage } from './document-form-page';
export { DocumentDetailPage } from './document-detail-page';
export { DOCUMENTS_RESOURCE } from './api';
export * from './types';
