/**
 * Official Communication routes.
 *   /api/v1/admin/official-communications/*  — authenticated; create/update/view = Super Admin +
 *                                              Content Editor + Publisher; lifecycle = Super Admin +
 *                                              Publisher.
 *   /api/v1/public/official-communications/* — unauthenticated; published only.
 *
 * Authorization reuses the shared role/permission middleware exactly like documents/institutions.
 * Logical `official-communications.*` keys are documented in official-communications.permissions.ts;
 * no RBAC schema change (development-rules §3).
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize, authorizePermissions, authorizeAnyPermission } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { officialCommunicationController } from './official-communications.controller';
import { officialCommunicationPublicController } from './official-communications.public.controller';

const readers = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];

// ── Admin ─────────────────────────────────────────────────────────────────────
export const officialCommunicationAdminRouter = Router();
officialCommunicationAdminRouter.param('id', uuidParam);
officialCommunicationAdminRouter.use(authenticate);

officialCommunicationAdminRouter.get('/', authorize(readers), officialCommunicationController.list);
officialCommunicationAdminRouter.post(
  '/',
  authorizeAnyPermission(['content.create', 'content.update']),
  officialCommunicationController.create,
);
officialCommunicationAdminRouter.get('/:id', authorize(readers), officialCommunicationController.detail);
officialCommunicationAdminRouter.patch(
  '/:id',
  authorizePermissions(['content.update']),
  officialCommunicationController.patch,
);

officialCommunicationAdminRouter.post(
  '/:id/publish',
  authorizePermissions(['content.publish']),
  officialCommunicationController.publish,
);
officialCommunicationAdminRouter.post(
  '/:id/unpublish',
  authorizePermissions(['content.unpublish']),
  officialCommunicationController.unpublish,
);
officialCommunicationAdminRouter.post(
  '/:id/archive',
  authorizePermissions(['content.archive']),
  officialCommunicationController.archive,
);
officialCommunicationAdminRouter.post(
  '/:id/restore',
  authorizePermissions(['content.restore']),
  officialCommunicationController.restore,
);

// ── Public ──────────────────────────────────────────────────────────────────────
export const officialCommunicationPublicRouter = Router();
officialCommunicationPublicRouter.get('/', officialCommunicationPublicController.list);
officialCommunicationPublicRouter.get('/:slug', officialCommunicationPublicController.detail);
