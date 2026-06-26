/**
 * Dashboard routes.
 *   /api/v1/admin/dashboard/*  — authenticated.
 *       reports list/detail .......... Super Admin + Content Editor + Publisher (read)
 *       report create / PATCH (layout)  Super Admin only (reports are a FIXED set; no builder)
 *       report lifecycle .............. Super Admin + Publisher (dedicated `dashboard.*` keys)
 *       metrics + datasets (read) ..... all CMS roles
 *       metrics + datasets (write) .... `dashboard.manage_data` (Publisher default; Editor by grant)
 *   /api/v1/public/dashboard/* — unauthenticated; published + active reports + resolved metrics.
 *
 * Authorization reuses the shared role/permission middleware. The new module-specific keys
 * (`dashboard.publish|unpublish|archive|restore|manage_data`) are seeded via the permission
 * catalog — no RBAC schema change.
 */
import {
  Router,
  type Request,
  type Response,
  type NextFunction,
  type RequestHandler,
} from 'express';
import multer, { MulterError } from 'multer';
import { authenticate } from '@/middleware/authenticate';
import { authorize, authorizePermissions } from '@/middleware/authorize';
import { uploadRateLimit } from '@/middleware/rate-limit';
import { enforceRequestSizeHeader } from '@/middleware/upload-limit';
import { uuidParam } from '@/middleware/validate-params';
import { ROLE_KEYS } from '@/modules/auth/auth.permissions';
import { uploadConfig } from '@/config';
import { ValidationError, UnsupportedFileTypeError, type AppError } from '@/shared/errors';
import { dashboardController } from './dashboard.controller';
import { dashboardPublicController } from './dashboard.public.controller';
import { DASHBOARD_PERMISSIONS } from './dashboard.permissions';

const readers = [ROLE_KEYS.superAdmin, ROLE_KEYS.contentEditor, ROLE_KEYS.publisher];
const superAdminOnly = [ROLE_KEYS.superAdmin];
const manageData = authorizePermissions([DASHBOARD_PERMISSIONS.manageData]);

// Multipart dataset upload (Issue 1): a single CSV/XLSX file in memory, bounded by the dataset size
// limit so an oversized file is rejected before buffering completes. Multer errors are translated into
// the typed error envelope, matching the media module.
const datasetUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: uploadConfig.maxDatasetMb * 1024 * 1024, files: 1 },
});

function translateMulter(err: unknown): AppError | unknown {
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE')
      return new ValidationError({ file: ['File exceeds the maximum upload size.'] });
    if (err.code === 'LIMIT_UNEXPECTED_FILE')
      return new UnsupportedFileTypeError('Unexpected upload field.');
    return new ValidationError({ file: [err.message] });
  }
  return err;
}

const datasetFile: RequestHandler = (req: Request, res: Response, next: NextFunction) =>
  datasetUpload.single('file')(req, res, (err?: unknown) =>
    err ? next(translateMulter(err)) : next(),
  );

// ── Admin ─────────────────────────────────────────────────────────────────────
export const dashboardAdminRouter = Router();
dashboardAdminRouter.param('id', uuidParam);
dashboardAdminRouter.param('report_id', uuidParam);
dashboardAdminRouter.use(authenticate);

// Reports — definition is Super Admin only; lifecycle reuses the shared content.* grants.
dashboardAdminRouter.get('/reports', authorize(readers), dashboardController.listReports);
dashboardAdminRouter.post('/reports', authorize(superAdminOnly), dashboardController.createReport);
dashboardAdminRouter.get('/reports/:id', authorize(readers), dashboardController.reportDetail);
dashboardAdminRouter.patch(
  '/reports/:id',
  authorize(superAdminOnly),
  dashboardController.patchReport,
);
dashboardAdminRouter.post(
  '/reports/:id/publish',
  authorizePermissions([DASHBOARD_PERMISSIONS.publish]),
  dashboardController.publishReport,
);
dashboardAdminRouter.post(
  '/reports/:id/unpublish',
  authorizePermissions([DASHBOARD_PERMISSIONS.unpublish]),
  dashboardController.unpublishReport,
);
dashboardAdminRouter.post(
  '/reports/:id/archive',
  authorizePermissions([DASHBOARD_PERMISSIONS.archive]),
  dashboardController.archiveReport,
);
dashboardAdminRouter.post(
  '/reports/:id/restore',
  authorizePermissions([DASHBOARD_PERMISSIONS.restore]),
  dashboardController.restoreReport,
);

// Metrics (nested under a report).
dashboardAdminRouter.get(
  '/reports/:report_id/metrics',
  authorize(readers),
  dashboardController.listMetrics,
);
dashboardAdminRouter.post(
  '/reports/:report_id/metrics',
  manageData,
  dashboardController.createMetric,
);
dashboardAdminRouter.patch(
  '/reports/:report_id/metrics/:id',
  manageData,
  dashboardController.patchMetric,
);
dashboardAdminRouter.delete(
  '/reports/:report_id/metrics/:id',
  manageData,
  dashboardController.removeMetric,
);

// Datasets (nested under a report) + standalone dataset detail.
dashboardAdminRouter.get(
  '/reports/:report_id/datasets',
  authorize(readers),
  dashboardController.listDatasets,
);
dashboardAdminRouter.post(
  '/reports/:report_id/datasets',
  manageData,
  dashboardController.createDataset,
);
dashboardAdminRouter.post(
  '/reports/:report_id/datasets/upload',
  uploadRateLimit,
  enforceRequestSizeHeader,
  manageData,
  datasetFile,
  dashboardController.uploadDataset,
);
dashboardAdminRouter.get('/datasets/:id', authorize(readers), dashboardController.datasetDetail);

// ── Public ──────────────────────────────────────────────────────────────────────
export const dashboardPublicRouter = Router();
dashboardPublicRouter.get('/', dashboardPublicController.dashboard);
// `kpis` is a fixed sub-path and MUST be registered before the `:report_key` catch-all.
dashboardPublicRouter.get('/kpis', dashboardPublicController.kpis);
dashboardPublicRouter.get('/:report_key', dashboardPublicController.reportByKey);
