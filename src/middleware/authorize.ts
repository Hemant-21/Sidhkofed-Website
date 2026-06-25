/**
 * Authorization middleware (TASK 9). Must run AFTER `authenticate()`.
 *
 *   authorize(['super_admin'])                    → passes if the user has ANY listed role
 *   authorizePermissions(['events.create',        → passes only if the user has ALL listed
 *                          'events.publish'])         permissions
 *
 * `super_admin` always passes (allow-all). Both guards resolve roles/permissions through
 * the cached permission service and memoize the result on `req.authz` so stacking guards
 * costs at most one resolution per request. Failures throw the shared typed errors
 * (`AuthenticationError` / `PermissionError`) → §1.4 401/403 envelopes. Permission keys
 * are canonical `module.action`; a `module:action` form is normalized for convenience.
 */
import type { Request, Response, NextFunction } from 'express';
import { AuthenticationError, PermissionError } from '@/shared/errors';
import { permissionService } from '@/modules/auth/permission.service';
import type { ResolvedAuthorization } from '@/modules/auth/auth.types';

/** Resolve (once per request) the authenticated user's roles/permissions. */
async function resolveAuthz(req: Request): Promise<ResolvedAuthorization> {
  if (!req.user) {
    throw new AuthenticationError('Authentication required.');
  }
  if (req.authz) return req.authz;
  const authz = await permissionService.getUserAuthorization(req.user.id);
  req.authz = authz;
  return authz;
}

/** Normalize `module:action` → `module.action` (canonical project form). */
function normalize(key: string): string {
  return key.includes(':') ? key.replace(/:/g, '.') : key;
}

/** Require ANY of the given role keys (super admin always allowed). */
export function authorize(roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    resolveAuthz(req)
      .then((authz) => {
        if (permissionService.hasAnyRole(authz, roles)) return next();
        throw new PermissionError();
      })
      .catch(next);
  };
}

/** Require ALL of the given permission keys (super admin always allowed). */
export function authorizePermissions(permissions: string[]) {
  const required = permissions.map(normalize);
  return (req: Request, _res: Response, next: NextFunction): void => {
    resolveAuthz(req)
      .then((authz) => {
        if (permissionService.hasAllPermissions(authz, required)) return next();
        throw new PermissionError();
      })
      .catch(next);
  };
}
