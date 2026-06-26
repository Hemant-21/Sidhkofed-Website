import { describe, expect, it } from 'vitest';
import { buildFaqPayload, emptyFaqForm, type FaqFormValues } from './faq-form-payload';

/**
 * Payload regression (Phase 15.7). Must match the backend `faqCreateSchema` EXACTLY
 * (faqs.validators.ts): optional `faq_category_id`, required `question_en`/`answer_en`, bilingual
 * optional fields, workflow fields, and NO unknown keys (`.strict()`).
 */
const BACKEND_KEYS = new Set([
  'faq_category_id',
  'question_en',
  'question_hi',
  'answer_en',
  'answer_hi',
  // workflow
  'public_visibility',
  'publish_start_at',
  'highlight_type',
  'highlight_start_at',
  'highlight_end_at',
  'display_order',
  'show_on_homepage',
]);

function values(overrides: Partial<FaqFormValues> = {}): FaqFormValues {
  return { ...emptyFaqForm(), question_en: 'Q?', answer_en: 'A.', ...overrides };
}

describe('buildFaqPayload', () => {
  it('emits only keys the backend validator accepts', () => {
    const p = buildFaqPayload(values());
    for (const key of Object.keys(p)) {
      expect(BACKEND_KEYS.has(key), `unexpected key: ${key}`).toBe(true);
    }
  });

  it('sends faq_category_id as null when uncategorised', () => {
    expect(buildFaqPayload(values({ faq_category_id: '' })).faq_category_id).toBeNull();
    expect(buildFaqPayload(values({ faq_category_id: 'cat-1' })).faq_category_id).toBe('cat-1');
  });

  it('keeps required question/answer trimmed and converts empty optionals to null', () => {
    const p = buildFaqPayload(values({ question_en: '  Q?  ', answer_en: ' A. ' }));
    expect(p.question_en).toBe('Q?');
    expect(p.answer_en).toBe('A.');
    expect(p.question_hi).toBeNull();
    expect(p.answer_hi).toBeNull();
  });

  it('only sends the highlight window when a highlight is active', () => {
    expect(buildFaqPayload(values({ highlight_type: '', highlight_start_at: '2026-01-01' })).highlight_start_at).toBeNull();
    const active = buildFaqPayload(values({ highlight_type: 'new', highlight_start_at: '2026-01-01' }));
    expect(active.highlight_type).toBe('new');
    expect(active.highlight_start_at).toBe('2026-01-01T00:00:00.000Z');
  });

  it('never produces server-managed fields', () => {
    const p = buildFaqPayload(values()) as Record<string, unknown>;
    expect(p.slug).toBeUndefined();
    expect(p.publication_state).toBeUndefined();
  });
});
