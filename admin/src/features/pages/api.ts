'use client';

/**
 * Pages data layer. Standard list/detail/create/update/lifecycle use the shared CRUD hooks
 * against the `pages` resource (the standard admin "P" pattern). No module-specific actions.
 */

import { adminResource } from '@/constants/api-endpoints';
import { get } from '@/lib/api/http';
import type { PageDetail } from './types';

export const PAGES_RESOURCE = 'pages';

export { PAGE_PERMS } from './permissions';

/** Typed detail fetch for callers outside the CRUD hook. */
export const fetchPage = (id: string) => get<PageDetail>(adminResource(PAGES_RESOURCE).detail(id));
