/**
 * Unit tests — faqs buildWhere (incl. search across question + answer), validators, and list-query
 * key validation. DB-free.
 */
import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import { buildWhere } from './faqs.repository';
import { validateFaqCreate } from './faqs.validators';
import { parseFaqFilters } from './faqs.query';
import { ValidationError } from '@/shared/errors';

const UUID = '44444444-4444-4444-8444-444444444444';
const reqWith = (query: Record<string, unknown>): Request => ({ query } as unknown as Request);

describe('faqs buildWhere', () => {
  it('applies the public predicate as an AND element', () => {
    const predicate = (buildWhere({}, { public: true }).AND as Array<Record<string, unknown>>)[0];
    expect(predicate.publicationState).toBe('published');
  });
  it('resolves faq_category by id-or-slug', () => {
    expect(buildWhere({ faqCategory: 'membership' }, {}).faqCategory).toEqual({ slug: 'membership' });
    expect(buildWhere({ faqCategory: UUID }, {}).faqCategory).toEqual({ id: UUID });
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
  it('accepts an optional faq_category_id', () => {
    expect(validateFaqCreate({ question_en: 'Q', answer_en: 'A', faq_category_id: UUID }).faq_category_id).toBe(UUID);
  });
  it('rejects a missing answer', () => {
    expect(() => validateFaqCreate({ question_en: 'Q' })).toThrow(ValidationError);
  });
  it('rejects a non-uuid faq_category_id', () => {
    expect(() => validateFaqCreate({ question_en: 'Q', answer_en: 'A', faq_category_id: 'x' })).toThrow(ValidationError);
  });
  it('rejects unknown keys', () => {
    expect(() => validateFaqCreate({ question_en: 'Q', answer_en: 'A', foo: 1 })).toThrow(ValidationError);
  });
});

describe('parseFaqFilters — surface separation', () => {
  it('accepts faq_category on the public surface', () => {
    expect(parseFaqFilters(reqWith({ faq_category: 'membership' }), { admin: false }).faqCategory).toBe('membership');
  });
  it('rejects show_on_homepage on the PUBLIC surface (admin-only)', () => {
    expect(() => parseFaqFilters(reqWith({ show_on_homepage: 'true' }), { admin: false })).toThrow(ValidationError);
  });
  it('accepts show_on_homepage + publication_state on the ADMIN surface', () => {
    const f = parseFaqFilters(reqWith({ show_on_homepage: 'true', publication_state: 'draft' }), { admin: true });
    expect(f.showOnHomepage).toBe(true);
    expect(f.publicationState).toBe('draft');
  });
});
