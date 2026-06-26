/**
 * Permission keys for Tenders.
 *
 * The backend authorizes this module with the SHARED `content.*` permission set
 * (tenders.routes.ts) — NOT `tenders.*` keys, which are never seeded. Reuse the shared
 * {@link CONTENT_PERMS} catalog so <Can> checks resolve against the keys the backend grants.
 * The backend remains the security boundary.
 */

export { CONTENT_PERMS as TENDER_PERMS } from '@/features/events/permissions';
