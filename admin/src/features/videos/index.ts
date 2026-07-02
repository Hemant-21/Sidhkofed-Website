/**
 * Videos feature (Phase 15.4). Full admin frontend for the YouTube video library — list,
 * create/edit (with live URL validation), detail (lazy embed preview), and lifecycle — built on
 * the shared infrastructure and the backend contracts. Videos stream from YouTube; files are never
 * hosted (codex §5.3).
 */
export { VideoListPage } from './video-list-page';
export { VideoFormPage } from './video-form-page';
export { VideoDetailPage } from './video-detail-page';
export { VIDEOS_RESOURCE } from './api';
export * from './types';
