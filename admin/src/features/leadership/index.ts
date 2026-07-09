/**
 * Leadership feature. Full admin frontend for the Leadership module — list, create/edit, detail,
 * and lifecycle — built on the shared 15.0/15.1 infrastructure and backend contracts. Mirrors the
 * Digital Services feature file-for-file; every leadership record is implicitly homepage content
 * (no `external_url`, no `show_on_homepage`).
 */
export { LeadershipListPage } from './leadership-list-page';
export { LeadershipFormPage } from './leadership-form-page';
export { LeadershipDetailPage } from './leadership-detail-page';
export { LEADERSHIP_RESOURCE } from './api';
export * from './types';
