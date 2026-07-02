'use client';

/**
 * Official Communications data layer. Standard list/detail/create/update/lifecycle use the
 * shared CRUD hooks against the `official-communications` resource. No module-specific
 * actions beyond the generic "P" pattern.
 */

import { adminResource } from '@/constants/api-endpoints';
import { get } from '@/lib/api/http';
import type { CommunicationDetail } from './types';

export const COMMUNICATIONS_RESOURCE = 'official-communications';

export { COMMUNICATION_PERMS } from './permissions';

/** Typed detail fetch for callers outside the CRUD hook. */
export const fetchCommunication = (id: string) =>
  get<CommunicationDetail>(adminResource(COMMUNICATIONS_RESOURCE).detail(id));
