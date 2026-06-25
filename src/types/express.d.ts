/**
 * Express request augmentation. `id` is the per-request correlation id surfaced in
 * every response envelope's `meta.request_id` and in request logs.
 */
import 'express';
import type { AuthenticatedUser, ResolvedAuthorization } from '@/modules/auth/auth.types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Correlation id, format `req_<uuid>`. Set by the requestId middleware. */
      id: string;
      /** Authenticated identity, set by the `authenticate()` middleware. */
      user?: AuthenticatedUser;
      /** Resolved roles/permissions, memoized per-request by the authorization guards. */
      authz?: ResolvedAuthorization;
    }
  }
}

export {};
