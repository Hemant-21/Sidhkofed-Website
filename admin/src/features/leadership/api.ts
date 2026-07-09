'use client';

/**
 * Leadership data layer. Standard list/detail/create/update/lifecycle use the shared CRUD
 * hooks against the `leadership` resource (the standard admin "P" pattern). No module-specific
 * actions. Every leadership record is implicitly homepage content — there is no separate public
 * listing page and no `show_on_homepage` field.
 */

import { adminResource } from '@/constants/api-endpoints';
import { get } from '@/lib/api/http';
import type { LeadershipDetail } from './types';

export const LEADERSHIP_RESOURCE = 'leadership';

export { LEADERSHIP_PERMS } from './permissions';

/** Typed detail fetch for callers outside the CRUD hook. */
export const fetchLeadership = (id: string) =>
  get<LeadershipDetail>(adminResource(LEADERSHIP_RESOURCE).detail(id));
