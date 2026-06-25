/**
 * Query-string parsing for menu endpoints. Admin list filters: location, is_active. Public tree
 * requires a valid `location`. Unknown keys / invalid enums → 422 (API spec §1.4).
 */
import type { Request } from 'express';
import { ValidationError } from '@/shared/errors';
import { parseBooleanFlag, assertKnownQueryKeys } from '@/shared/list-query';
import { MENU_LOCATIONS, type MenuItemFilters, type MenuLocation } from './menus.types';

function locationOf(v: unknown, required: boolean): MenuLocation | undefined {
  const s = typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
  if (!s) {
    if (required) throw new ValidationError({ location: [`Required. One of: ${MENU_LOCATIONS.join(', ')}.`] });
    return undefined;
  }
  if (!(MENU_LOCATIONS as readonly string[]).includes(s)) {
    throw new ValidationError({ location: [`Must be one of: ${MENU_LOCATIONS.join(', ')}.`] });
  }
  return s as MenuLocation;
}

const ADMIN_FILTER_KEYS = ['location', 'is_active'] as const;

export function parseMenuFilters(req: Request): MenuItemFilters {
  const q = req.query;
  assertKnownQueryKeys(q, ADMIN_FILTER_KEYS);
  return {
    location: locationOf(q.location, false),
    isActive: parseBooleanFlag(q.is_active, 'is_active'),
  };
}

/** Public `?location=` — required (API spec §5: `GET /public/menus?location=header|footer|utility`). */
export function parsePublicMenuLocation(req: Request): MenuLocation {
  assertKnownQueryKeys(req.query, ['location']);
  return locationOf(req.query.location, true) as MenuLocation;
}
