/**
 * Permission keys for Procurement Updates.
 *
 * The backend authorizes this module with the SHARED `content.*` permission set
 * (procurement-updates.routes.ts) — NOT `procurement-updates.*` keys, which are never seeded.
 * Reuse the shared {@link CONTENT_PERMS} catalog so <Can> checks resolve against the keys the
 * backend grants. The backend remains the security boundary.
 */

export { CONTENT_PERMS as PROCUREMENT_PERMS } from '@/features/events/permissions';
