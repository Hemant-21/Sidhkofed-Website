/**
 * Query-string parsing for membership list endpoints → framework-free `MembershipFilters` +
 * allow-listed ordering. Unknown ordering → 422; unknown filter keys → 422 (API spec §1.4).
 *
 * Public filters (API spec §5): institution, membership_level, membership_type, district,
 * reporting_period, year. The admin surface additionally accepts publication_state,
 * show_on_homepage, district_union, and status.
 */
import type { Request } from 'express';
import { resolveOrdering } from '@/shared/listing';
import { parsePublicationState, parseBooleanFlag, assertKnownQueryKeys } from '@/shared/list-query';
import { ValidationError } from '@/shared/errors';
import {
  MEMBERSHIP_ORDERING_FIELDS,
  MEMBERSHIP_LEVELS,
  MEMBERSHIP_TYPES,
  MEMBERSHIP_STATUSES,
  type MembershipFilters,
  type MembershipOrderingField,
  type MembershipLevel,
  type MembershipType,
  type MembershipStatus,
} from './memberships.types';

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

/** Validate a value against an allow-list, returning the typed member or 422 on a bad value. */
function parseEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T | undefined {
  const raw = str(value);
  if (raw === undefined) return undefined;
  if (!(allowed as readonly string[]).includes(raw)) {
    throw new ValidationError({ [field]: [`Must be one of: ${allowed.join(', ')}.`] });
  }
  return raw as T;
}

/** Parse a four-digit calendar year (join_date year filter), or 422. */
function parseYear(value: unknown): number | undefined {
  const raw = str(value);
  if (raw === undefined) return undefined;
  if (!/^\d{4}$/.test(raw)) throw new ValidationError({ year: ['Must be a four-digit year.'] });
  return Number(raw);
}

const PUBLIC_FILTER_KEYS = [
  'institution',
  'membership_level',
  'membership_type',
  'district',
  'reporting_period',
  'year',
] as const;
const ADMIN_FILTER_KEYS = [
  ...PUBLIC_FILTER_KEYS,
  'publication_state',
  'show_on_homepage',
  'district_union',
  'status',
] as const;

export function parseMembershipFilters(req: Request, opts: { admin: boolean }): MembershipFilters {
  const q = req.query;
  assertKnownQueryKeys(q, opts.admin ? ADMIN_FILTER_KEYS : PUBLIC_FILTER_KEYS);
  const filters: MembershipFilters = {
    institution: str(q.institution),
    membershipLevel: parseEnum<MembershipLevel>(
      q.membership_level,
      MEMBERSHIP_LEVELS,
      'membership_level',
    ),
    membershipType: parseEnum<MembershipType>(
      q.membership_type,
      MEMBERSHIP_TYPES,
      'membership_type',
    ),
    district: str(q.district),
    reportingPeriod: str(q.reporting_period),
    year: parseYear(q.year),
  };
  if (opts.admin) {
    filters.publicationState = parsePublicationState(q.publication_state);
    filters.showOnHomepage = parseBooleanFlag(q.show_on_homepage, 'show_on_homepage');
    filters.districtUnion = str(q.district_union);
    filters.status = parseEnum<MembershipStatus>(q.status, MEMBERSHIP_STATUSES, 'status');
  }
  return filters;
}

const ADMIN_DEFAULT = {
  field: 'created_at' as MembershipOrderingField,
  direction: 'desc' as const,
};
const PUBLIC_DEFAULT = {
  field: 'display_order' as MembershipOrderingField,
  direction: 'asc' as const,
};

export function parseMembershipOrdering(
  req: Request,
  admin: boolean,
): { field: MembershipOrderingField; direction: 'asc' | 'desc' } {
  const ob = resolveOrdering(
    req.query.ordering,
    MEMBERSHIP_ORDERING_FIELDS,
    admin ? ADMIN_DEFAULT : PUBLIC_DEFAULT,
  );
  return { field: ob.field as MembershipOrderingField, direction: ob.direction };
}
