/**
 * Shared route-parameter validation (pre-Phase-5 audit, Issue 9).
 *
 * UUID path params (`:id`, `:imageId`, …) were passed straight to Prisma; a malformed value
 * surfaced as a Prisma `P2023` → opaque 500. This guard validates them at the edge and
 * returns a `422 validation_error` instead, before any query runs.
 *
 * Use via Express `router.param` so it covers every route that uses the param with one line:
 *   router.param('id', uuidParam);
 */
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '@/shared/errors';

const uuidSchema = z.string().uuid();

/** Express `router.param` handler: reject a non-UUID path param with 422. */
export function uuidParam(
  _req: Request,
  _res: Response,
  next: NextFunction,
  value: string,
  name: string,
): void {
  if (!uuidSchema.safeParse(value).success) {
    return next(new ValidationError({ [name]: [`"${name}" must be a valid UUID.`] }));
  }
  next();
}

/** Inline middleware variant: `requireUuidParams('id', 'imageId')`. */
export function requireUuidParams(...names: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const fields: Record<string, string[]> = {};
    for (const name of names) {
      if (!uuidSchema.safeParse(req.params[name]).success) {
        fields[name] = [`"${name}" must be a valid UUID.`];
      }
    }
    if (Object.keys(fields).length) return next(new ValidationError(fields));
    next();
  };
}
