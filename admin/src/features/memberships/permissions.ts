/**
 * Permission keys for Memberships. Institutional Membership is a publishable **P** content resource;
 * the backend authorizes it with the SHARED `content.*` permission set (memberships.routes.ts) — not
 * `memberships.*` keys, which are never seeded. We reuse the shared {@link CONTENT_PERMS} catalog so
 * <Can> checks resolve against the keys the backend actually grants. The backend stays the boundary.
 */
export { CONTENT_PERMS as MEMBERSHIP_PERMS } from '@/features/events/permissions';
