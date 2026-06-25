/**
 * Query-string parsing for institution list endpoints → framework-free `InstitutionFilters` +
 * allow-listed ordering. Unknown ordering → 422; unknown filter keys are ignored.
 */
import type { Request } from 'express';
import { resolveOrdering } from '@/shared/listing';
import { parsePublicationState, parseBooleanFlag } from '@/shared/list-query';
import {
  INSTITUTION_ORDERING_FIELDS,
  type InstitutionFilters,
  type InstitutionOrderingField,
} from './institutions.types';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);

export function parseInstitutionFilters(req: Request, opts: { admin: boolean }): InstitutionFilters {
  const q = req.query;
  const filters: InstitutionFilters = {
    institutionType: str(q.institution_type),
    district: str(q.district),
    showOnHomepage: parseBooleanFlag(q.show_on_homepage, 'show_on_homepage'),
    search: str(q.search),
  };
  if (opts.admin) filters.publicationState = parsePublicationState(q.publication_state);
  return filters;
}

const ADMIN_DEFAULT = { field: 'created_at' as InstitutionOrderingField, direction: 'desc' as const };
const PUBLIC_DEFAULT = { field: 'display_order' as InstitutionOrderingField, direction: 'asc' as const };

export function parseInstitutionOrdering(
  req: Request,
  admin: boolean,
): { field: InstitutionOrderingField; direction: 'asc' | 'desc' } {
  const ob = resolveOrdering(req.query.ordering, INSTITUTION_ORDERING_FIELDS, admin ? ADMIN_DEFAULT : PUBLIC_DEFAULT);
  return { field: ob.field as InstitutionOrderingField, direction: ob.direction };
}
