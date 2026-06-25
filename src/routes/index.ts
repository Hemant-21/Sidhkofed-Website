/**
 * Route aggregation — the single place that knows the full URL surface.
 *
 * FOUNDATION: only the API root descriptor is mounted under the immutable `/api/v1`
 * base. Module routers (public/admin/auth) attach here as they are built, e.g.
 *   apiRouter.use('/public/events', eventsPublicRouter);
 *   apiRouter.use('/admin/events', eventsAdminRouter);
 * Health probes live at the app root and are mounted directly in app.ts.
 */
import { Router, type Request, type Response } from 'express';
import { success } from '@/shared/envelope';
import { appConfig } from '@/config';
import { authRouter } from '@/modules/auth/auth.routes';
import { settingsRouter } from '@/modules/settings/settings.routes';
import { auditRouter } from '@/modules/audit/audit.routes';
import { mediaRouter, mediaPublicRouter } from '@/modules/media/media.routes';
import { galleryRouter } from '@/modules/galleries/gallery.routes';
import { videoRouter } from '@/modules/videos/video.routes';
import { mastersAdminRouter, mastersPublicRouter } from '@/modules/masters/masters.routes';

export const apiRouter = Router();

// API root descriptor — confirms the version contract is live.
apiRouter.get('/', (req: Request, res: Response) => {
  res.json(
    success(
      {
        name: appConfig.name,
        api_version: 'v1',
        base_path: appConfig.apiBasePath,
        namespaces: ['public', 'admin', 'auth'],
      },
      String(req.id),
    ),
  );
});

// ── Module routers. Auth/RBAC (Phase 2) + shared infrastructure (Phase 3) are live.
apiRouter.use('/auth', authRouter);

// Admin namespace (bearer token + RBAC enforced inside each router).
apiRouter.use('/admin/settings', settingsRouter);
apiRouter.use('/admin/audit-logs', auditRouter);
apiRouter.use('/admin/media', mediaRouter);
apiRouter.use('/admin/galleries', galleryRouter);
apiRouter.use('/admin/videos', videoRouter);
apiRouter.use('/admin/masters', mastersAdminRouter);

// Public namespace (no auth; active + visible records only).
apiRouter.use('/public/masters', mastersPublicRouter);
apiRouter.use('/public/media', mediaPublicRouter);
