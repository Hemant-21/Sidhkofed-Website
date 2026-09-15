/**
 * Website Metrics routes — mounted under the existing `/api/v1/admin/dashboard` prefix alongside
 * `dashboard.routes.ts` and `operational-reports.routes.ts` (see `dashboard.routes.ts`).
 *
 *   GET    /admin/dashboard/website-metrics                list (filter: placement/enabled/archived)
 *   POST   /admin/dashboard/website-metrics                 create draft config
 *   GET    /admin/dashboard/website-metrics/:id             detail
 *   PATCH  /admin/dashboard/website-metrics/:id             update config (bumps configRevision)
 *   POST   /admin/dashboard/website-metrics/:id/preview     server-side calculate + cache a preview
 *   POST   /admin/dashboard/website-metrics/:id/publish     consume a preview token → new snapshot
 *   POST   /admin/dashboard/website-metrics/:id/unpublish   clear currentSnapshotId (keeps history)
 *   POST   /admin/dashboard/website-metrics/:id/archive
 *   POST   /admin/dashboard/website-metrics/:id/restore
 *   GET    /admin/dashboard/website-metrics/:id/history     snapshots, newest-first
 *   POST   /admin/dashboard/website-metrics/:id/flag-review    manual flag (Stage 2 scope — see notes)
 *   POST   /admin/dashboard/website-metrics/:id/unflag-review
 *
 * `.view`/`.manage_data` → content_editor + publisher (super_admin implicit); `.publish`/
 * `.unpublish`/`.archive`/`.restore` → publisher only (spec: "Publisher/Super Admin publish").
 * flag/unflag-review is gated by `.manage_data` (a review flag is a data-quality note, not a
 * publish-lifecycle action).
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { authorizePermissions } from '@/middleware/authorize';
import { uuidParam } from '@/middleware/validate-params';
import { websiteMetricsController } from './website-metrics.controller';
import { websiteMetricsPublicController } from './website-metrics.public.controller';
import { WEBSITE_METRICS_PERMISSIONS } from './website-metrics.permissions';

export const websiteMetricsRouter = Router();
websiteMetricsRouter.param('id', uuidParam);
websiteMetricsRouter.use(authenticate);

const canView = authorizePermissions([WEBSITE_METRICS_PERMISSIONS.view]);
const canManageData = authorizePermissions([WEBSITE_METRICS_PERMISSIONS.manageData]);
const canPublish = authorizePermissions([WEBSITE_METRICS_PERMISSIONS.publish]);
const canUnpublish = authorizePermissions([WEBSITE_METRICS_PERMISSIONS.unpublish]);
const canArchive = authorizePermissions([WEBSITE_METRICS_PERMISSIONS.archive]);
const canRestore = authorizePermissions([WEBSITE_METRICS_PERMISSIONS.restore]);

websiteMetricsRouter.get('/', canView, websiteMetricsController.list);
websiteMetricsRouter.post('/', canManageData, websiteMetricsController.create);
websiteMetricsRouter.get('/:id', canView, websiteMetricsController.detail);
websiteMetricsRouter.patch('/:id', canManageData, websiteMetricsController.patch);
websiteMetricsRouter.post('/:id/preview', canManageData, websiteMetricsController.preview);
websiteMetricsRouter.post('/:id/publish', canPublish, websiteMetricsController.publish);
websiteMetricsRouter.post('/:id/unpublish', canUnpublish, websiteMetricsController.unpublish);
websiteMetricsRouter.post('/:id/archive', canArchive, websiteMetricsController.archive);
websiteMetricsRouter.post('/:id/restore', canRestore, websiteMetricsController.restore);
websiteMetricsRouter.get('/:id/history', canView, websiteMetricsController.history);
websiteMetricsRouter.post('/:id/flag-review', canManageData, websiteMetricsController.flagReview);
websiteMetricsRouter.post('/:id/unflag-review', canManageData, websiteMetricsController.unflagReview);

// ── Public ──────────────────────────────────────────────────────────────────────
// `/api/v1/public/website-metrics` (Stage 3) — unauthenticated; mounted directly in
// `src/routes/index.ts` at its own top-level path (distinct from `/public/dashboard/*`, so there is
// no catch-all collision to guard against — see that file's registration comment for the analogous
// `/public/dashboard/:report_key` caveat).
export const websiteMetricsPublicRouter = Router();
websiteMetricsPublicRouter.get('/', websiteMetricsPublicController.list);
