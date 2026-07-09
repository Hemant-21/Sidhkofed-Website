/**
 * Permission keys for Leadership.
 *
 * Leadership is a publishable **P** content resource; the backend authorizes it with the
 * SHARED `content.*` permission set (leadership.routes.ts) — NOT `leadership.*` keys, which are
 * never seeded. We reuse the shared {@link CONTENT_PERMS} catalog so <Can> checks resolve
 * against the keys the backend actually grants. The backend remains the security boundary.
 */

export { CONTENT_PERMS as LEADERSHIP_PERMS } from '@/features/events/permissions';
