/**
 * Query-string parsing for the user list endpoint → framework-free `UserFilters` + allow-listed
 * ordering. Unknown ordering → 422; unknown filter keys → 422 (mirrors institutions.query.ts).
 */
import type { Request } from 'express';
import { resolveOrdering } from '@/shared/listing';
import { parseBooleanFlag, assertKnownQueryKeys } from '@/shared/list-query';
import { USER_ORDERING_FIELDS, type UserFilters, type UserOrderingField } from './users.types';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);

const FILTER_KEYS = ['is_active', 'role'] as const;

export function parseUserFilters(req: Request): UserFilters {
  const q = req.query;
  assertKnownQueryKeys(q, FILTER_KEYS);
  return {
    isActive: parseBooleanFlag(q.is_active, 'is_active'),
    role: str(q.role),
    search: str(q.search),
  };
}

const DEFAULT_ORDER = { field: 'created_at' as UserOrderingField, direction: 'desc' as const };

export function parseUserOrdering(req: Request): { field: UserOrderingField; direction: 'asc' | 'desc' } {
  const ob = resolveOrdering(req.query.ordering, USER_ORDERING_FIELDS, DEFAULT_ORDER);
  return { field: ob.field as UserOrderingField, direction: ob.direction };
}
