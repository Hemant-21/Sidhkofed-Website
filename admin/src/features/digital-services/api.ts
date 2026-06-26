'use client';

/**
 * Digital Services data layer. Standard list/detail/create/update/lifecycle use the shared CRUD
 * hooks against the `digital-services` resource (the standard admin "P" pattern). No module-specific
 * actions.
 */

import { adminResource } from '@/constants/api-endpoints';
import { get } from '@/lib/api/http';
import type { DigitalServiceDetail } from './types';

export const DIGITAL_SERVICES_RESOURCE = 'digital-services';

export { DIGITAL_SERVICE_PERMS } from './permissions';

/** Typed detail fetch for callers outside the CRUD hook. */
export const fetchDigitalService = (id: string) =>
  get<DigitalServiceDetail>(adminResource(DIGITAL_SERVICES_RESOURCE).detail(id));
