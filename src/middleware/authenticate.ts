/**
 * Authentication middleware (TASK 8).
 *
 * Responsibilities: extract the Bearer token → validate it → load the user → attach
 * `req.user`. Any failure throws the shared `AuthenticationError`, which the error
 * middleware renders as the §1.4 `401 authentication_required` envelope. Uses the
 * existing error-handling system (no hand-crafted error JSON here).
 */
import type { Request, Response, NextFunction } from 'express';
import { AuthenticationError } from '@/shared/errors';
import { tokenService } from '@/modules/auth/token.service';
import { authRepository } from '@/modules/auth/auth.repository';

/** Pull a Bearer token out of the Authorization header. */
function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token.trim() || null;
}

async function run(req: Request): Promise<void> {
  const token = extractBearer(req);
  if (!token) {
    throw new AuthenticationError('Authentication required.');
  }

  const claims = tokenService.verifyAccessToken(token);

  const user = await authRepository.findUserById(claims.sub);
  if (!user || !user.isActive) {
    // Token may be valid but the account was removed/disabled since issuance.
    throw new AuthenticationError('Account is no longer active.');
  }

  req.user = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    preferredLanguage: user.preferredLanguage,
    isActive: user.isActive,
    sessionId: claims.sid,
  };
}

/** Require a valid access token; populates `req.user` for downstream guards/handlers. */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  run(req).then(() => next()).catch(next);
}
