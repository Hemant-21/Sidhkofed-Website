'use client';

/**
 * News data layer. News uses the standard "P" resource pattern (list/detail/update/lifecycle)
 * via the shared CRUD hooks — there is NO news create endpoint (creation is the event's
 * publish-as-news action), so this module exposes no create. Permission keys are the shared
 * `content.*` set (news.routes.ts), reused from the events feature to avoid duplication.
 */

export const NEWS_RESOURCE = 'news';

export { CONTENT_PERMS } from '@/features/events/permissions';
