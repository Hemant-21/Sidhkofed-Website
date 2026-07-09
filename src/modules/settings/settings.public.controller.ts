/**
 * Public settings controller — `GET /api/v1/public/settings/:group`.
 *
 * Exposes ONLY a curated allow-list of setting GROUPS to unauthenticated callers —
 * never the raw admin catalog/list (`/admin/settings` stays Super-Admin-only and
 * unchanged). Today just `contact` (office info for the website footer/contact/
 * enquiry pages). Add a group to `PUBLIC_SETTING_GROUPS` to expose more later; nothing
 * else needs to change.
 */
import type { Request, Response, NextFunction } from 'express';
import { success } from '@/shared/envelope';
import { NotFoundError } from '@/shared/errors';
import { settingsService } from './settings.service';
import type { SettingGroup } from './settings.catalog';

const PUBLIC_SETTING_GROUPS: readonly SettingGroup[] = ['contact'];

function isPublicGroup(group: string): group is SettingGroup {
  return (PUBLIC_SETTING_GROUPS as readonly string[]).includes(group);
}

/** GET /public/settings/:group */
export function getPublicGroup(req: Request, res: Response, next: NextFunction): void {
  const group = req.params.group as string;
  if (!isPublicGroup(group)) {
    next(new NotFoundError(`Unknown public settings group "${group}".`));
    return;
  }
  settingsService
    .getGroup(group)
    .then((values) => res.status(200).json(success(values, String(req.id))))
    .catch(next);
}

export const settingsPublicController = { getPublicGroup };
