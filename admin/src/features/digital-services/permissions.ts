/**
 * Permission keys for Digital Services.
 *
 * Digital Services are a publishable **P** content resource; the backend authorizes them with the
 * SHARED `content.*` permission set (digital-services.routes.ts) — NOT `digital_services.*` keys,
 * which are never seeded. We reuse the shared {@link CONTENT_PERMS} catalog so <Can> checks resolve
 * against the keys the backend actually grants. The backend remains the security boundary.
 */

export { CONTENT_PERMS as DIGITAL_SERVICE_PERMS } from '@/features/events/permissions';
