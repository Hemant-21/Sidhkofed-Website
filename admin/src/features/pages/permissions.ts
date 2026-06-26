/**
 * Permission keys for Pages.
 *
 * Pages are a publishable **P** content resource; the backend authorizes them with the SHARED
 * `content.*` permission set (pages.routes.ts: create = content.create/update, update = content.update,
 * publish/unpublish/archive/restore = content.*) — NOT `pages.*` keys, which are never seeded. We
 * reuse the shared {@link CONTENT_PERMS} catalog so <Can> checks resolve against the keys the backend
 * actually grants. The backend remains the security boundary.
 */

export { CONTENT_PERMS as PAGE_PERMS } from '@/features/events/permissions';
