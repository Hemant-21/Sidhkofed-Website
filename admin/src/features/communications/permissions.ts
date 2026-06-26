/**
 * Permission keys for Official Communications.
 *
 * The backend authorizes this module with the SHARED `content.*` permission set
 * (official-communications.routes.ts: create = content.create/update, update = content.update,
 * publish/unpublish/archive/restore = content.*) — NOT `official-communications.*` keys, which
 * are never seeded. We therefore reuse the shared {@link CONTENT_PERMS} catalog so <Can> checks
 * resolve against the keys the backend actually grants. The backend remains the security boundary.
 */

export { CONTENT_PERMS as COMMUNICATION_PERMS } from '@/features/events/permissions';
