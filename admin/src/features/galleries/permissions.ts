/**
 * Permission keys for Galleries.
 *
 * Galleries are a publishable **P** content resource; the backend authorizes writes/lifecycle/image
 * management with the SHARED `content.*` permission set (gallery.routes.ts) — NOT `galleries.*` keys,
 * which are never seeded. Reads are role-based. We reuse the shared {@link CONTENT_PERMS} catalog so
 * <Can> checks resolve against the keys the backend actually grants. The backend remains the security
 * boundary.
 */

export { CONTENT_PERMS as GALLERY_PERMS } from '@/features/events/permissions';
