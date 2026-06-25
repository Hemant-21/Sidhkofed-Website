/**
 * Settings controller — `GET /admin/settings`, `GET|PUT /admin/settings/:key`
 * (API spec §6). Returns settings grouped; PUT validates against the typed catalog.
 */
import { createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { success } from '@/shared/envelope';
import { ValidationError } from '@/shared/errors';
import { abuseConfig } from '@/config';
import { settingsService } from './settings.service';
import type { AuditContext } from '@/modules/audit/audit.service';

function auditContext(req: Request): AuditContext {
  const ip = req.ip ?? 'unknown';
  return {
    userId: req.user?.id ?? null,
    ipHash: createHash('sha256').update(`${ip}:${abuseConfig.ipHashSalt}`).digest('hex'),
    userAgent: req.headers['user-agent'] ?? null,
  };
}

/** GET /admin/settings — all settings, grouped by category. */
export function listAll(req: Request, res: Response, next: NextFunction): void {
  settingsService
    .getAllWithMeta()
    .then((items) => {
      const grouped: Record<string, Array<{ key: string; value: unknown; description: string }>> = {};
      for (const item of items) {
        (grouped[item.group] ??= []).push({ key: item.key, value: item.value, description: item.description });
      }
      res.status(200).json(success({ groups: grouped }, String(req.id)));
    })
    .catch(next);
}

/** GET /admin/settings/:key */
export function getOne(req: Request, res: Response, next: NextFunction): void {
  settingsService
    .getKeyWithMeta(req.params.key as string)
    .then((item) => res.status(200).json(success(item, String(req.id))))
    .catch(next);
}

/** PUT /admin/settings/:key — body `{ value }`. */
export function putOne(req: Request, res: Response, next: NextFunction): void {
  const body = req.body as { value?: unknown } | undefined;
  if (!body || !Object.prototype.hasOwnProperty.call(body, 'value')) {
    return next(new ValidationError({ value: ['This field is required.'] }));
  }
  settingsService
    .setValue(req.params.key as string, body.value, auditContext(req))
    .then((item) => res.status(200).json(success(item, String(req.id), 'Setting updated.')))
    .catch(next);
}

export const settingsController = { listAll, getOne, putOne };
