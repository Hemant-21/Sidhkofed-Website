/**
 * Query-string parsing for document list endpoints. Translates the request query into the
 * framework-free `DocumentFilters` + an allow-listed ordering. Unknown ordering values raise a
 * 422 (resolveOrdering); unknown filter keys are simply ignored (never passed to Prisma).
 */
import type { Request } from 'express';
import { resolveOrdering } from '@/shared/listing';
import { ValidationError } from '@/shared/errors';
import { parsePublicationState } from '@/shared/list-query';
import { DOCUMENT_ORDERING_FIELDS, type DocumentFilters, type DocumentOrderingField } from './documents.types';

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);

function boolFlag(v: unknown): boolean | undefined {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return undefined;
}

function yearOf(v: unknown): number | undefined {
  const s = str(v);
  if (!s) return undefined;
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1900 || n > 3000) throw new ValidationError({ year: ['Invalid year.'] });
  return n;
}

function dateOf(v: unknown, field: string): Date | undefined {
  const s = str(v);
  if (!s) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(`${s}T00:00:00Z`))) {
    throw new ValidationError({ [field]: ['Use a YYYY-MM-DD date.'] });
  }
  return new Date(`${s}T00:00:00Z`);
}

function langOf(v: unknown): 'en' | 'hi' | undefined {
  const s = str(v);
  if (s === 'en' || s === 'hi') return s;
  if (s !== undefined) throw new ValidationError({ language: ['Language must be "en" or "hi".'] });
  return undefined;
}

/** Common filters shared by admin + public lists. `publication_state` is admin-only. */
export function parseDocumentFilters(req: Request, opts: { admin: boolean }): DocumentFilters {
  const q = req.query;
  const filters: DocumentFilters = {
    documentType: str(q.document_type),
    knowledgeCategory: str(q.knowledge_category),
    knowledgeCentre: boolFlag(q.knowledge_centre),
    commodity: str(q.commodity),
    district: str(q.district),
    financialYear: str(q.financial_year),
    language: langOf(q.language),
    year: yearOf(q.year),
    dateFrom: dateOf(q.date_from, 'date_from'),
    dateTo: dateOf(q.date_to, 'date_to'),
    search: str(q.search),
  };
  if (opts.admin) {
    // Validate strictly — an invalid publication_state now returns 422 instead of being
    // silently ignored (remediation — consistent enum validation).
    filters.publicationState = parsePublicationState(q.publication_state);
  }
  return filters;
}

const ADMIN_DEFAULT: { field: DocumentOrderingField; direction: 'asc' | 'desc' } = {
  field: 'created_at',
  direction: 'desc',
};
const PUBLIC_DEFAULT: { field: DocumentOrderingField; direction: 'asc' | 'desc' } = {
  field: 'publication_date',
  direction: 'desc',
};

export function parseDocumentOrdering(req: Request, admin: boolean): { field: DocumentOrderingField; direction: 'asc' | 'desc' } {
  const ob = resolveOrdering(req.query.ordering, DOCUMENT_ORDERING_FIELDS, admin ? ADMIN_DEFAULT : PUBLIC_DEFAULT);
  return { field: ob.field as DocumentOrderingField, direction: ob.direction };
}
