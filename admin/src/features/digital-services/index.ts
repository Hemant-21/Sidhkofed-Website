/**
 * Digital Services feature (Phase 15.7). Full admin frontend for the Digital Services module — list,
 * create/edit, detail, and lifecycle — built on the shared 15.0/15.1 infrastructure and backend
 * contracts. Controlled links to approved external systems only (codex §4.14). External links open
 * safely in a new tab; the CMS never proxies/embeds them.
 */
export { DigitalServiceListPage } from './digital-service-list-page';
export { DigitalServiceFormPage } from './digital-service-form-page';
export { DigitalServiceDetailPage } from './digital-service-detail-page';
export { DIGITAL_SERVICES_RESOURCE } from './api';
export * from './types';
