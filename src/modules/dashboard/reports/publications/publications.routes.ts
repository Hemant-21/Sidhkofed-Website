/**
 * Report Publications routes — mounted at `/admin/dashboard/reports/publications`.
 *   GET  /:financialYearId/status    published/unpublished + last-published info
 *   GET  /:financialYearId/history   publication history (newest first)
 *   POST /:financialYearId/preview   compute + cache a full-FY preview of all three reports
 *   POST /:financialYearId/publish   body { previewToken } — approve & publish atomically
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorizePermissions } from '@/middleware/authorize';
import { publicationsController } from './publications.controller';
import { REPORT_PUBLICATIONS_PERMISSIONS } from './publications.permissions';

export const publicationsRouter = Router();
publicationsRouter.use(authenticate);

const canView = authorizePermissions([REPORT_PUBLICATIONS_PERMISSIONS.view]);
const canPublish = authorizePermissions([REPORT_PUBLICATIONS_PERMISSIONS.publish]);

publicationsRouter.get('/:financialYearId/status', canView, publicationsController.getStatus);
publicationsRouter.get('/:financialYearId/history', canView, publicationsController.getHistory);
publicationsRouter.post('/:financialYearId/preview', canPublish, publicationsController.preview);
publicationsRouter.post('/:financialYearId/publish', canPublish, publicationsController.publish);
