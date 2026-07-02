/**
 * Digital Service routes.
 *   /api/v1/admin/digital-services/*  — authenticated; create/update/view = Super Admin + Content
 *                                       Editor + Publisher; lifecycle = Super Admin + Publisher.
 *   /api/v1/public/digital-services   — unauthenticated; published only.
 *
 * Authorization reuses the shared role/permission middleware exactly like tenders/pages/faqs.
 * Logical `digital_services.*` keys are documented in digital-services.permissions.ts; no RBAC change.
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize, authorizePermissions, authorizeAnyPermission } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { digitalServiceController } from './digital-services.controller';
import { digitalServicePublicController } from './digital-services.public.controller';

const readers = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];

// ── Admin ─────────────────────────────────────────────────────────────────────
export const digitalServiceAdminRouter = Router();
digitalServiceAdminRouter.param('id', uuidParam);
digitalServiceAdminRouter.use(authenticate);

digitalServiceAdminRouter.get('/', authorize(readers), digitalServiceController.list);
digitalServiceAdminRouter.post(
  '/',
  authorizeAnyPermission(['content.create', 'content.update']),
  digitalServiceController.create,
);
digitalServiceAdminRouter.get('/:id', authorize(readers), digitalServiceController.detail);
digitalServiceAdminRouter.patch('/:id', authorizePermissions(['content.update']), digitalServiceController.patch);

digitalServiceAdminRouter.post('/:id/publish', authorizePermissions(['content.publish']), digitalServiceController.publish);
digitalServiceAdminRouter.post('/:id/unpublish', authorizePermissions(['content.unpublish']), digitalServiceController.unpublish);
digitalServiceAdminRouter.post('/:id/archive', authorizePermissions(['content.archive']), digitalServiceController.archive);
digitalServiceAdminRouter.post('/:id/restore', authorizePermissions(['content.restore']), digitalServiceController.restore);

// ── Public ──────────────────────────────────────────────────────────────────────
export const digitalServicePublicRouter = Router();
digitalServicePublicRouter.get('/', digitalServicePublicController.list);
