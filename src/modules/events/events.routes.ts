/**
 * Event routes.
 *   /api/v1/admin/events/*  — authenticated; create/update/view = all CMS roles; lifecycle +
 *                             complete/cancel/publish-as-news = Super Admin + Publisher.
 *   /api/v1/admin/event-types/{id}/field-definitions/* — Super Admin only (controlled-field schema).
 *   /api/v1/public/events/* — unauthenticated; published only.
 *
 * Authorization reuses the shared role/permission middleware. Field definitions are restricted to
 * Super Admin via `authorize([superAdmin])` (the wildcard role covers them — no dedicated grant).
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize, authorizePermissions, authorizeAnyPermission } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { eventController } from './events.controller';
import { eventPublicController } from './events.public.controller';
import { fieldDefinitionController } from './field-definitions/field-definitions.controller';

const readers = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];
const publishers = [ROLE_KEYS.superAdmin, ROLE_KEYS.publisher];
const superAdminOnly = [ROLE_KEYS.superAdmin];

// ── Admin: events ───────────────────────────────────────────────────────────────
export const eventAdminRouter = Router();
eventAdminRouter.param('id', uuidParam);
eventAdminRouter.use(authenticate);

eventAdminRouter.get('/', authorize(readers), eventController.list);
eventAdminRouter.post('/', authorizeAnyPermission(['content.create', 'content.update']), eventController.create);
eventAdminRouter.get('/:id', authorize(readers), eventController.detail);
eventAdminRouter.patch('/:id', authorizePermissions(['content.update']), eventController.patch);

eventAdminRouter.post('/:id/publish', authorizePermissions(['content.publish']), eventController.publish);
eventAdminRouter.post('/:id/unpublish', authorizePermissions(['content.unpublish']), eventController.unpublish);
eventAdminRouter.post('/:id/archive', authorizePermissions(['content.archive']), eventController.archive);
eventAdminRouter.post('/:id/restore', authorizePermissions(['content.restore']), eventController.restore);

// Event-specific actions (publisher-level — they change the published-facing record materially).
eventAdminRouter.post('/:id/complete', authorize(publishers), eventController.complete);
eventAdminRouter.post('/:id/cancel', authorize(publishers), eventController.cancel);
eventAdminRouter.post('/:id/publish-as-news', authorizePermissions(['content.publish']), eventController.publishAsNews);

// ── Admin: event-type field definitions (Super Admin only) ──────────────────────
export const eventTypeFieldDefinitionsRouter = Router();
eventTypeFieldDefinitionsRouter.param('event_type_id', uuidParam);
eventTypeFieldDefinitionsRouter.param('id', uuidParam);
eventTypeFieldDefinitionsRouter.use(authenticate);

eventTypeFieldDefinitionsRouter.get('/:event_type_id/field-definitions', authorize(readers), fieldDefinitionController.list);
eventTypeFieldDefinitionsRouter.post('/:event_type_id/field-definitions', authorize(superAdminOnly), fieldDefinitionController.create);
eventTypeFieldDefinitionsRouter.patch('/:event_type_id/field-definitions/:id', authorize(superAdminOnly), fieldDefinitionController.patch);
eventTypeFieldDefinitionsRouter.post('/:event_type_id/field-definitions/:id/activate', authorize(superAdminOnly), fieldDefinitionController.activate);
eventTypeFieldDefinitionsRouter.post('/:event_type_id/field-definitions/:id/deactivate', authorize(superAdminOnly), fieldDefinitionController.deactivate);

// ── Public ──────────────────────────────────────────────────────────────────────
export const eventPublicRouter = Router();
eventPublicRouter.get('/', eventPublicController.list);
eventPublicRouter.get('/:slug', eventPublicController.detail);
