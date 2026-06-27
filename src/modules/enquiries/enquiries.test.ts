/**
 * Unit tests — enquiries repository buildWhere + query parsing (DB-free).
 * Tests the filter-to-Prisma-where mapping and ordering allow-list enforcement.
 */
import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import { buildWhere } from './enquiries.repository';
import { parseEnquiryFilters, parseEnquiryOrdering } from './enquiries.query';
import { ValidationError } from '@/shared/errors';

const UUID = '22222222-2222-4222-8222-222222222222';

const reqWith = (query: Record<string, unknown>): Request => ({ query } as unknown as Request);

// ── buildWhere ────────────────────────────────────────────────────────────────
describe('enquiries buildWhere', () => {
  it('returns empty where for no filters', () => {
    expect(buildWhere({})).toEqual({});
  });

  it('resolves enquiry_type by UUID', () => {
    const w = buildWhere({ enquiryType: UUID });
    expect(w.enquiryType).toEqual({ id: UUID });
  });

  it('resolves enquiry_type by slug', () => {
    const w = buildWhere({ enquiryType: 'buyer-enquiry' });
    expect(w.enquiryType).toEqual({ slug: 'buyer-enquiry' });
  });

  it('filters archived=true → archivedAt not null', () => {
    const w = buildWhere({ archived: true });
    expect(w.archivedAt).toEqual({ not: null });
  });

  it('filters archived=false → archivedAt null', () => {
    const w = buildWhere({ archived: false });
    expect(w.archivedAt).toBeNull();
  });

  it('applies date range for dateFrom and dateTo', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    const to = new Date('2026-06-30T00:00:00Z');
    const w = buildWhere({ dateFrom: from, dateTo: to });
    expect(w.submittedAt).toEqual({ gte: from, lte: to });
  });

  it('applies search across name, email, subject, organization', () => {
    const w = buildWhere({ search: 'ramesh' });
    const andBlock = w.AND as Array<Record<string, unknown>>;
    expect(Array.isArray(andBlock)).toBe(true);
    const orBlock = andBlock[0]?.OR as Array<Record<string, unknown>>;
    expect(Array.isArray(orBlock)).toBe(true);
    expect(orBlock.some((c) => 'name' in c)).toBe(true);
    expect(orBlock.some((c) => 'email' in c)).toBe(true);
  });

  it('applies spamState filter', () => {
    const w = buildWhere({ spamState: 'spam' });
    expect(w.spamState).toBe('spam');
  });
});

// ── parseEnquiryFilters ───────────────────────────────────────────────────────
describe('parseEnquiryFilters', () => {
  it('parses enquiry_type, spam_state, archived from query', () => {
    const f = parseEnquiryFilters(reqWith({ enquiry_type: UUID, spam_state: 'clean', archived: 'false' }));
    expect(f.enquiryType).toBe(UUID);
    expect(f.spamState).toBe('clean');
    expect(f.archived).toBe(false);
  });

  it('rejects an invalid spam_state', () => {
    expect(() => parseEnquiryFilters(reqWith({ spam_state: 'blocked' }))).toThrow(ValidationError);
  });

  it('rejects an invalid date format', () => {
    expect(() => parseEnquiryFilters(reqWith({ date_from: '01-01-2026' }))).toThrow(ValidationError);
  });

  it('rejects unknown query parameters', () => {
    expect(() => parseEnquiryFilters(reqWith({ mystery_field: 'value' }))).toThrow(ValidationError);
  });

  it('returns undefined for absent optional filters', () => {
    const f = parseEnquiryFilters(reqWith({}));
    expect(f.spamState).toBeUndefined();
    expect(f.archived).toBeUndefined();
  });
});

// ── parseEnquiryOrdering ──────────────────────────────────────────────────────
describe('parseEnquiryOrdering', () => {
  it('defaults to submitted_at desc', () => {
    const o = parseEnquiryOrdering(reqWith({}));
    expect(o.field).toBe('submitted_at');
    expect(o.direction).toBe('desc');
  });

  it('resolves -created_at to created_at desc', () => {
    const o = parseEnquiryOrdering(reqWith({ ordering: '-created_at' }));
    expect(o.field).toBe('created_at');
    expect(o.direction).toBe('desc');
  });

  it('rejects an unknown ordering field', () => {
    expect(() => parseEnquiryOrdering(reqWith({ ordering: 'name' }))).toThrow(ValidationError);
  });
});
