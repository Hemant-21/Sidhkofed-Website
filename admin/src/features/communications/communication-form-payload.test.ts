import { describe, expect, it } from 'vitest';
import {
  buildCommunicationPayload,
  emptyCommunicationForm,
  type CommunicationFormValues,
} from './communication-form-payload';

/**
 * Payload regression (Phase 15.6 audit — Issue 2). The generated payload must match the backend
 * `officialCommunicationCreateSchema` EXACTLY: bilingual `summary_*`/`body_*` (NOT the removed
 * `short_description_*`), `YYYY-MM-DD` dates, ISO timestamps for scheduling, and no unknown keys
 * (the backend uses `.strict()` and rejects extras).
 */

/** The exact set of keys the backend validator accepts (official-communications.validators.ts). */
const BACKEND_KEYS = new Set([
  'title_en',
  'title_hi',
  'summary_en',
  'summary_hi',
  'body_en',
  'body_hi',
  'communication_type_id',
  'reference_number',
  'issue_date',
  'effective_date',
  'expiry_date',
  'issuing_authority',
  'document_id',
  // workflow
  'public_visibility',
  'publish_start_at',
  'highlight_type',
  'highlight_start_at',
  'highlight_end_at',
  'display_order',
  'show_on_homepage',
]);

function values(overrides: Partial<CommunicationFormValues> = {}): CommunicationFormValues {
  return { ...emptyCommunicationForm(), title_en: 'Notice', communication_type_id: 'ct1', ...overrides };
}

describe('buildCommunicationPayload', () => {
  it('emits only keys the backend validator accepts (no unknown keys)', () => {
    const p = buildCommunicationPayload(values({ summary_en: 'S', body_en: 'B' }));
    for (const key of Object.keys(p)) {
      expect(BACKEND_KEYS.has(key), `unexpected key: ${key}`).toBe(true);
    }
  });

  it('uses backend summary_*/body_* fields — never the removed short_description_*', () => {
    const p = buildCommunicationPayload(
      values({ summary_en: 'Sum', summary_hi: 'सार', body_en: 'Body', body_hi: 'विवरण' }),
    ) as Record<string, unknown>;
    expect(p.summary_en).toBe('Sum');
    expect(p.summary_hi).toBe('सार');
    expect(p.body_en).toBe('Body');
    expect(p.body_hi).toBe('विवरण');
    expect(p).not.toHaveProperty('short_description_en');
    expect(p).not.toHaveProperty('short_description_hi');
  });

  it('converts empty bilingual content to null', () => {
    const p = buildCommunicationPayload(values());
    expect(p.summary_en).toBeNull();
    expect(p.summary_hi).toBeNull();
    expect(p.body_en).toBeNull();
    expect(p.body_hi).toBeNull();
  });

  it('keeps issue/effective/expiry as YYYY-MM-DD calendar dates', () => {
    const p = buildCommunicationPayload(
      values({ issue_date: '2026-01-05', effective_date: '2026-01-10', expiry_date: '2026-03-01' }),
    );
    expect(p.issue_date).toBe('2026-01-05');
    expect(p.effective_date).toBe('2026-01-10');
    expect(p.expiry_date).toBe('2026-03-01');
  });

  it('only sends the highlight window when a highlight is active (widened to ISO)', () => {
    expect(buildCommunicationPayload(values({ highlight_type: '', highlight_start_at: '2026-01-01' })).highlight_start_at).toBeNull();
    const active = buildCommunicationPayload(values({ highlight_type: 'urgent', highlight_start_at: '2026-01-01' }));
    expect(active.highlight_type).toBe('urgent');
    expect(active.highlight_start_at).toBe('2026-01-01T00:00:00.000Z');
  });

  it('never produces server-managed fields', () => {
    const p = buildCommunicationPayload(values()) as Record<string, unknown>;
    expect(p.slug).toBeUndefined();
    expect(p.publication_state).toBeUndefined();
    expect(p.created_by).toBeUndefined();
  });
});
