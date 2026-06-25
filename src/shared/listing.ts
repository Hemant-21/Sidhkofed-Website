/**
 * Listing helpers shared by admin list endpoints: a strict ordering allow-list resolver
 * (coding-standards §6 — reject unknown ordering with 422, never pass arbitrary client
 * fields into Prisma `orderBy`).
 */
import { ValidationError } from './errors';

export type SortDirection = 'asc' | 'desc';

export interface OrderBy {
  field: string;
  direction: SortDirection;
}

/**
 * Resolve a client `ordering` value (e.g. `-created_at`, `display_order`) against an
 * allow-list. A leading `-` means descending. Unknown fields raise a 422. The returned
 * `field` is the API field name; map it to the Prisma column at the call site.
 */
export function resolveOrdering(
  raw: unknown,
  allowed: readonly string[],
  fallback: OrderBy,
): OrderBy {
  if (raw === undefined || raw === null || raw === '') return fallback;
  if (typeof raw !== 'string') {
    throw new ValidationError({ ordering: ['Invalid ordering value.'] });
  }
  const direction: SortDirection = raw.startsWith('-') ? 'desc' : 'asc';
  const field = raw.replace(/^-/, '');
  if (!allowed.includes(field)) {
    throw new ValidationError({ ordering: [`Unsupported ordering field "${field}".`] });
  }
  return { field, direction };
}
