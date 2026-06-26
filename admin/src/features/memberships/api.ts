'use client';

/**
 * Memberships data layer. Standard list/detail/create/update/lifecycle use the shared CRUD hooks
 * against the `memberships` resource (the standard admin "P" pattern). No module-specific actions
 * beyond the shared publishing lifecycle.
 */

import { adminResource } from '@/constants/api-endpoints';
import { get } from '@/lib/api/http';
import type { MembershipDetail } from './types';

export const MEMBERSHIPS_RESOURCE = 'memberships';

export { MEMBERSHIP_PERMS } from './permissions';

/** Typed detail fetch for callers outside the CRUD hook. */
export const fetchMembership = (id: string) => get<MembershipDetail>(adminResource(MEMBERSHIPS_RESOURCE).detail(id));
