/**
 * Document routes.
 *   /api/v1/admin/documents/*  — authenticated; create/update/view = Super Admin + Content
 *                                Editor + Publisher; lifecycle + replace-file = Super Admin +
 *                                Publisher (editors cannot publish/archive) — API spec §8.
 *   /api/v1/public/documents/* + /public/knowledge-centre — unauthenticated; published,
 *                                publicly-visible, non-archived documents only.
 *
 * Authorization reuses the existing role-based `authorize()` middleware exactly like every
 * other content **P** module (galleries/videos). The logical `documents.*` permission keys are
 * documented in documents.permissions.ts; no RBAC schema change is made (development-rules §3).
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize, authorizePermissions, authorizeAnyPermission } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { documentController } from './documents.controller';
import { documentPublicController } from './documents.public.controller';

// Writes/lifecycle are permission-checked against the seeded generic `content.*` set
// (remediation Issue 5); reads stay role-based because no `content.view` permission exists.
// Super Admin bypasses every check. `content.create OR content.update` for create preserves
// the pre-remediation behaviour exactly (Content Editor has create, Publisher has update).
const readers = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];
const publishers = [ROLE_KEYS.superAdmin, ROLE_KEYS.publisher];

// ── Admin ─────────────────────────────────────────────────────────────────────
export const documentAdminRouter = Router();
documentAdminRouter.param('id', uuidParam); // 422 for a malformed :id, not 500
documentAdminRouter.use(authenticate);

documentAdminRouter.get('/', authorize(readers), documentController.list);
documentAdminRouter.post('/', authorizeAnyPermission(['content.create', 'content.update']), documentController.create);
documentAdminRouter.get('/:id', authorize(readers), documentController.detail);
documentAdminRouter.patch('/:id', authorizePermissions(['content.update']), documentController.patch);

documentAdminRouter.post('/:id/publish', authorizePermissions(['content.publish']), documentController.publish);
documentAdminRouter.post('/:id/unpublish', authorizePermissions(['content.unpublish']), documentController.unpublish);
documentAdminRouter.post('/:id/archive', authorizePermissions(['content.archive']), documentController.archive);
documentAdminRouter.post('/:id/restore', authorizePermissions(['content.restore']), documentController.restore);

// Version management — swap the underlying file asset. Restricted to Publisher + Super Admin
// (role-based: no content permission maps to "replace file"; preserves prior behaviour).
documentAdminRouter.post('/:id/replace-file', authorize(publishers), documentController.replaceFile);

// ── Public ──────────────────────────────────────────────────────────────────────
export const documentPublicRouter = Router();
documentPublicRouter.get('/', documentPublicController.list);
documentPublicRouter.get('/:slug', documentPublicController.detail);

/** Dedicated Knowledge Centre listing (mounted at /public/knowledge-centre). */
export const knowledgeCentreRouter = Router();
knowledgeCentreRouter.get('/', documentPublicController.knowledgeCentre);
