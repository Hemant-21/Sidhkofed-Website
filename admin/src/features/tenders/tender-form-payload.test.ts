import { describe, expect, it } from 'vitest';
import { buildTenderPayload, emptyTenderForm, type TenderFormValues } from './tender-form-payload';

/**
 * Payload regression (Phase 15.6 audit — Issue 2). The generated payload must match the backend
 * `tenderCreateSchema` EXACTLY: bilingual `summary_*` (NOT `short_description_*`), `publish_date` as
 * a calendar date, `submission_deadline`/`opening_date` as ISO-8601 timestamps (the validator uses
 * `isoTimestamp`, not `dateOnly`), and NO `issuing_authority`/`related_category_or_department`
 * (those fields do not exist on the backend model).
 */

/** The exact set of keys the backend validator accepts (tenders.validators.ts). */
const BACKEND_KEYS = new Set([
  'title_en',
  'title_hi',
  'summary_en',
  'summary_hi',
  'tender_type_id',
  'tender_number',
  'publish_date',
  'submission_deadline',
  'opening_date',
  'tender_status',
  'gem_url',
  // workflow
  'public_visibility',
  'publish_start_at',
  'highlight_type',
  'highlight_start_at',
  'highlight_end_at',
  'display_order',
  'show_on_homepage',
]);

function values(overrides: Partial<TenderFormValues> = {}): TenderFormValues {
  return { ...emptyTenderForm(), title_en: 'Tender', tender_type_id: 'tt1', ...overrides };
}

describe('buildTenderPayload', () => {
  it('emits only keys the backend validator accepts (no unknown keys)', () => {
    const p = buildTenderPayload(values());
    for (const key of Object.keys(p)) {
      expect(BACKEND_KEYS.has(key), `unexpected key: ${key}`).toBe(true);
    }
  });

  it('drops fields absent from the backend model', () => {
    const p = buildTenderPayload(values()) as Record<string, unknown>;
    expect(p).not.toHaveProperty('issuing_authority');
    expect(p).not.toHaveProperty('related_category_or_department');
    expect(p).not.toHaveProperty('short_description_en');
    expect(p).not.toHaveProperty('short_description_hi');
  });

  it('uses backend summary_* fields', () => {
    const p = buildTenderPayload(values({ summary_en: 'Sum', summary_hi: 'सार' }));
    expect(p.summary_en).toBe('Sum');
    expect(p.summary_hi).toBe('सार');
  });

  it('sends publish_date as a calendar date but deadline/opening as ISO-8601 timestamps', () => {
    const p = buildTenderPayload(
      values({ publish_date: '2026-02-01', submission_deadline: '2026-02-20', opening_date: '2026-02-25' }),
    );
    expect(p.publish_date).toBe('2026-02-01');
    expect(p.submission_deadline).toBe('2026-02-20T00:00:00.000Z');
    expect(p.opening_date).toBe('2026-02-25T00:00:00.000Z');
  });

  it('sends null timestamps when deadline/opening are empty', () => {
    const p = buildTenderPayload(values({ submission_deadline: '', opening_date: '' }));
    expect(p.submission_deadline).toBeNull();
    expect(p.opening_date).toBeNull();
  });

  it('passes the GeM URL through untouched (backend validates HTTPS)', () => {
    const p = buildTenderPayload(values({ gem_url: 'https://gem.gov.in/abc' }));
    expect(p.gem_url).toBe('https://gem.gov.in/abc');
  });

  it('never produces server-managed fields', () => {
    const p = buildTenderPayload(values()) as Record<string, unknown>;
    expect(p.slug).toBeUndefined();
    expect(p.publication_state).toBeUndefined();
    expect(p.created_by).toBeUndefined();
  });
});
