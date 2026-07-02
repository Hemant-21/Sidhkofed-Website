/**
 * 404 handler for unmatched routes. Throws a typed NotFoundError so the global error
 * handler formats it through the single envelope (never a bare Express 404).
 */
import type { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '@/shared/errors';

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route not found: ${req.method} ${req.path}`));
}
