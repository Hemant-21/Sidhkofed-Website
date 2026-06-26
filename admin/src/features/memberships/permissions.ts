/**
<<<<<<< HEAD
 * Permission keys for Memberships. Institutional Membership is a publishable **P** content resource;
 * the backend authorizes it with the SHARED `content.*` permission set (memberships.routes.ts) — not
 * `memberships.*` keys, which are never seeded. We reuse the shared {@link CONTENT_PERMS} catalog so
 * <Can> checks resolve against the keys the backend actually grants. The backend stays the boundary.
 */
=======
 * Permission keys for Institutional Membership.
 *
 * The backend authorizes this module with the SHARED `content.*` permission set
 * (memberships.routes.ts: create = content.create/update, bulk-upload = content.create,
 * update = content.update, publish/unpublish/archive/restore = content.*) — NOT `memberships.*`
 * keys, which are documented but map onto the seeded `content.*` set. We therefore reuse the shared
 * {@link CONTENT_PERMS} catalog so <Can> checks resolve against the keys the backend actually
 * grants. The backend remains the security boundary.
 */

>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
export { CONTENT_PERMS as MEMBERSHIP_PERMS } from '@/features/events/permissions';
