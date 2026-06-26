'use client';

/**
 * FAQs data layer. Standard list/detail/create/update/lifecycle use the shared CRUD hooks against
 * the `faqs` resource (the standard admin "P" pattern). No module-specific actions.
 */

import { adminResource } from '@/constants/api-endpoints';
import { get } from '@/lib/api/http';
import type { FaqDetail } from './types';

export const FAQS_RESOURCE = 'faqs';

export { FAQ_PERMS } from './permissions';

/** Typed detail fetch for callers outside the CRUD hook. */
export const fetchFaq = (id: string) => get<FaqDetail>(adminResource(FAQS_RESOURCE).detail(id));
