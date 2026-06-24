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

// ── Module routers mount below as modules are implemented (out of foundation scope).
// apiRouter.use('/auth', authRouter);
// apiRouter.use('/public', publicRouter);
// apiRouter.use('/admin', adminRouter);
