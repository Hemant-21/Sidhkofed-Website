/**
 * Unit tests — faqs buildWhere (incl. search across question + answer), validators, and list-query
 * key validation. DB-free.
 */
import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import { buildWhere } from './faqs.repository';
import { validateFaqCreate, validateFaqUpdate } from './faqs.validators';
import { parseFaqFilters } from './faqs.query';
import { ValidationError } from '@/shared/errors';

const reqWith = (query: Record<string, unknown>): Request => ({ query } as unknown as Request);

describe('faqs buildWhere', () => {
  it('applies the public predicate as an AND element', () => {
    const predicate = (buildWhere({}, { public: true }).AND as Array<Record<string, unknown>>)[0];
    expect(predicate.publicationState).toBe('published');
  });
  it('filters by page_key via the pageAssignments relation', () => {
    expect(buildWhere({ pageKey: 'membership' }, {}).pageAssignments).toEqual({ some: { pageKey: 'membership' } });
  });
  it('search covers question AND answer (en + hi)', () => {
    const or = (buildWhere({ search: 'fee' }, {}).AND as Array<{ OR: Array<Record<string, unknown>> }>)[0].OR;
    const keys = or.map((o) => Object.keys(o)[0]);
    expect(keys).toEqual(['questionEn', 'questionHi', 'answerEn', 'answerHi']);
  });
});

describe('validateFaqCreate', () => {
  it('accepts a minimal FAQ (question + answer)', () => {
    const out = validateFaqCreate({ question_en: 'How to join?', answer_en: 'Apply online.' });
    expect(out.question_en).toBe('How to join?');
  });
  it('accepts optional page_assignments with a registered page key', () => {
    const out = validateFaqCreate({
      question_en: 'Q',
      answer_en: 'A',
      page_assignments: [{ page_key: 'home', display_order: 0 }],
    });
    expect(out.page_assignments).toEqual([{ page_key: 'home', display_order: 0 }]);
  });
  it('rejects a missing answer', () => {
    expect(() => validateFaqCreate({ question_en: 'Q' })).toThrow(ValidationError);
  });
  it('rejects an unknown page key', () => {
    expect(() =>
      validateFaqCreate({ question_en: 'Q', answer_en: 'A', page_assignments: [{ page_key: 'nope', display_order: 0 }] }),
    ).toThrow(ValidationError);
  });
  it('rejects duplicate page keys in the same payload', () => {
    expect(() =>
      validateFaqCreate({
        question_en: 'Q',
        answer_en: 'A',
        page_assignments: [
          { page_key: 'home', display_order: 0 },
          { page_key: 'home', display_order: 1 },
        ],
      }),
    ).toThrow(ValidationError);
  });
  it('rejects show_on_homepage as an unknown key (replaced by a home page assignment)', () => {
    expect(() => validateFaqCreate({ question_en: 'Q', answer_en: 'A', show_on_homepage: true })).toThrow(ValidationError);
  });
  it('rejects unknown keys', () => {
    expect(() => validateFaqCreate({ question_en: 'Q', answer_en: 'A', foo: 1 })).toThrow(ValidationError);
  });
});

describe('validateFaqUpdate — omission vs explicit empty array', () => {
  it('omits page_assignments entirely from the parsed result when not sent', () => {
    const out = validateFaqUpdate({ answer_en: 'Updated' });
    expect('page_assignments' in out).toBe(false);
  });
  it('parses an explicit empty array as a real, present value', () => {
    const out = validateFaqUpdate({ page_assignments: [] });
    expect(out.page_assignments).toEqual([]);
  });
});

describe('parseFaqFilters — surface separation', () => {
  it('accepts page_key on the public surface', () => {
    expect(parseFaqFilters(reqWith({ page_key: 'membership' }), { admin: false }).pageKey).toBe('membership');
  });
  it('accepts search on the public surface', () => {
    expect(parseFaqFilters(reqWith({ search: 'fee' }), { admin: false }).search).toBe('fee');
  });
  it('rejects an unknown page_key on the public surface (never falls back to unfiltered)', () => {
    expect(() => parseFaqFilters(reqWith({ page_key: 'nope' }), { admin: false })).toThrow(ValidationError);
  });
  it('rejects publication_state on the PUBLIC surface (admin-only)', () => {
    expect(() => parseFaqFilters(reqWith({ publication_state: 'draft' }), { admin: false })).toThrow(ValidationError);
  });
  it('accepts publication_state on the ADMIN surface', () => {
    const f = parseFaqFilters(reqWith({ publication_state: 'draft' }), { admin: true });
    expect(f.publicationState).toBe('draft');
  });
});
