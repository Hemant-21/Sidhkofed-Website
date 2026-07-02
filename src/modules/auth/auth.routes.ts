/**
 * Auth routes — `/api/v1/auth/*` (API spec §2). Mounted by the route aggregator.
 *
 *   POST /auth/login    public
 *   POST /auth/refresh  public token operation (cookie or body refresh token)
 *   POST /auth/logout   valid-refresh-token / authenticated caller; idempotent
 *   GET  /auth/me       authenticated (Bearer access token)
 */
import { Router } from 'express';
import { authenticate } from '@/middleware/authenticate';
import { loginRateLimit, refreshRateLimit, logoutRateLimit } from '@/middleware/rate-limit';
import { authController } from './auth.controller';

export const authRouter = Router();

// Redis-backed rate limiting on the credential endpoints (Issue 5): login 5/15m,
// refresh 30/15m, logout 30/15m. Over the limit → 429.
authRouter.post('/login', loginRateLimit, authController.login);
authRouter.post('/refresh', refreshRateLimit, authController.refresh);
authRouter.post('/logout', logoutRateLimit, authController.logout);
authRouter.get('/me', authenticate, authController.me);
