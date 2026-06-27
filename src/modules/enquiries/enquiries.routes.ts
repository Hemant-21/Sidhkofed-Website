/**
 * Enquiry routes.
 *   POST /api/v1/public/enquiries          — unauthenticated; rate-limited; CAPTCHA required.
 *   GET  /api/v1/admin/enquiries           — Publisher + Super Admin (read/manage).
 *   GET  /api/v1/admin/enquiries/export    — Publisher + Super Admin (XLSX download).
 *   GET  /api/v1/admin/enquiries/:id       — Publisher + Super Admin.
 *   PATCH /api/v1/admin/enquiries/:id      — Publisher + Super Admin (notes + spam_state only).
 *   POST /api/v1/admin/enquiries/:id/archive — Publisher + Super Admin (idempotent).
 *
 * RBAC: API spec §8 — "Publisher and Super Admin may manage it; editors have no default access."
 * The export route is registered BEFORE the /:id param route so `export` is not treated as an id.
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorize } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { enquiryRateLimit } from '@/middleware/rate-limit';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { enquiryController } from './enquiries.controller';
import { enquiryPublicController } from './enquiries.public.controller';

const managers = [ROLE_KEYS.superAdmin, ROLE_KEYS.publisher];

// ── Public ─────────────────────────────────────────────────────────────────────
export const enquiryPublicRouter = Router();
enquiryPublicRouter.post('/', enquiryRateLimit, enquiryPublicController.submit);

// ── Admin ──────────────────────────────────────────────────────────────────────
export const enquiryAdminRouter = Router();
enquiryAdminRouter.use(authenticate);
enquiryAdminRouter.use(authorize(managers));

// `/export` MUST be registered before `/:id` to avoid the param middleware treating
// the literal string "export" as a UUID and returning a 400 before the handler runs.
enquiryAdminRouter.get('/export', enquiryController.exportXlsx);

enquiryAdminRouter.param('id', uuidParam);
enquiryAdminRouter.get('/', enquiryController.list);
enquiryAdminRouter.get('/:id', enquiryController.detail);
enquiryAdminRouter.patch('/:id', enquiryController.patch);
enquiryAdminRouter.post('/:id/archive', enquiryController.archive);
