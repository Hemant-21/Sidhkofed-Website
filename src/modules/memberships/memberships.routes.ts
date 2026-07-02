/**
 * Institutional Membership routes.
 *   /api/v1/admin/memberships/*  — authenticated; create/update/view = Super Admin + Content
 *                                  Editor + Publisher; lifecycle = Super Admin + Publisher.
 *   /api/v1/public/memberships/* — unauthenticated; published only; directory data.
 *
 * Authorization reuses the shared role/permission middleware exactly like institutions/faqs.
 * Logical `memberships.*` keys are documented in memberships.permissions.ts; no RBAC schema
 * change (development-rules §3). Bulk upload reuses the content create grant.
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize, authorizePermissions, authorizeAnyPermission } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { membershipController } from './memberships.controller';
import { membershipPublicController } from './memberships.public.controller';

const readers = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];

// ── Admin ─────────────────────────────────────────────────────────────────────
export const membershipAdminRouter = Router();
membershipAdminRouter.param('id', uuidParam);
membershipAdminRouter.use(authenticate);

membershipAdminRouter.get('/', authorize(readers), membershipController.list);
membershipAdminRouter.post(
  '/',
  authorizeAnyPermission(['content.create', 'content.update']),
  membershipController.create,
);
membershipAdminRouter.post(
  '/bulk-upload',
  authorizePermissions(['content.create']),
  membershipController.bulkUpload,
);
membershipAdminRouter.get('/:id', authorize(readers), membershipController.detail);
membershipAdminRouter.patch(
  '/:id',
  authorizePermissions(['content.update']),
  membershipController.patch,
);

membershipAdminRouter.post(
  '/:id/publish',
  authorizePermissions(['content.publish']),
  membershipController.publish,
);
membershipAdminRouter.post(
  '/:id/unpublish',
  authorizePermissions(['content.unpublish']),
  membershipController.unpublish,
);
membershipAdminRouter.post(
  '/:id/archive',
  authorizePermissions(['content.archive']),
  membershipController.archive,
);
membershipAdminRouter.post(
  '/:id/restore',
  authorizePermissions(['content.restore']),
  membershipController.restore,
);

// ── Public ──────────────────────────────────────────────────────────────────────
export const membershipPublicRouter = Router();
membershipPublicRouter.get('/', membershipPublicController.list);
membershipPublicRouter.get('/:slug', membershipPublicController.detail);
