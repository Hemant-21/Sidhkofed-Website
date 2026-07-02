/**
 * Toolkits feature (Phase 15.5). Full admin frontend for the Toolkit module — list, create/edit,
 * detail, catalogue item management, and read-only distribution summary — built entirely on the
 * shared 15.0/15.1 infrastructure and the backend contracts. Toolkit links a Programme/Scheme +
 * Commodity + ordered ToolkitItems; per-event distribution figures roll up from the Events module
 * (codex §4.3 / API spec §5 & §6).
 */
export { ToolkitListPage } from './toolkit-list-page';
export { ToolkitFormPage } from './toolkit-form-page';
export { ToolkitDetailPage } from './toolkit-detail-page';
export { ToolkitDistributionsPage } from './toolkit-distributions-page';
export { TOOLKITS_RESOURCE } from './api';
export * from './types';
