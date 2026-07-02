/**
 * Events feature (Phase 15.3). Full admin frontend for the single Events operation —
 * list, create/edit, detail, lifecycle, dynamic fields, completion, and publish-as-news —
 * built entirely on the shared 15.0/15.1 infrastructure and the backend contracts.
 */
export { EventListPage } from './event-list-page';
export { EventFormPage } from './event-form-page';
export { EventDetailPage } from './event-detail-page';
export { EVENTS_RESOURCE, NEWS_RESOURCE } from './api';
export * from './types';
