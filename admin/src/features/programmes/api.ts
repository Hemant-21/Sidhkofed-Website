'use client';

/**
 * Programmes data layer. Standard list/detail/create/update/lifecycle come from the shared CRUD
 * hooks against the `programmes` resource — no bespoke fetch logic. Programmes have no
 * module-specific actions beyond the generic "P" pattern, so this module only re-exports the
 * resource key and the module-specific permission set.
 */

import { adminResource } from '@/constants/api-endpoints';
import { get } from '@/lib/api/http';
import type { ProgrammeDetail } from './types';

export const PROGRAMMES_RESOURCE = 'programmes';

export { PROGRAMME_PERMS } from './permissions';

/** Re-export a typed detail fetch for any caller that needs it outside the CRUD hook. */
export const fetchProgramme = (id: string) => get<ProgrammeDetail>(adminResource(PROGRAMMES_RESOURCE).detail(id));
