import { describe, expect, it } from 'vitest';
import {
  buildProcurementPayload,
  emptyProcurementForm,
  type ProcurementFormValues,
} from './procurement-form-payload';

/**
 * Payload regression (Phase 15.6 audit — Issue 2). The generated payload must match the backend
 * `procurementUpdateCreateSchema` EXACTLY: bilingual `summary_*` + `description_*` (NOT the removed
 * `short_description_*`), `rate` as a JSON NUMBER (the validator is `z.number()`, not a string), and
 * empty master ids coerced to null (the validator expects uuid-or-null, never '').
 */

/** The exact set of keys the backend validator accepts (procurement-updates.validators.ts). */
const BACKEND_KEYS = new Set([
  'title_en',
  'title_hi',
  'summary_en',
  'summary_hi',
  'description_en',
  'description_hi',
  'procurement_update_type_id',
  'commodity_id',
  'rate',
  'unit',
  'quantity',
  'display_quantity_as_mt',
  'effective_date',
  'period_start',
  'period_end',
  'district_id',
  'block_id',
  'location_text',
  'programme_scheme_id',
  'document_id',
  'status',
  // workflow
  'public_visibility',
  'publish_start_at',
  'highlight_type',
  'highlight_start_at',
  'highlight_end_at',
  'display_order',
  'show_on_homepage',
]);

function values(overrides: Partial<ProcurementFormValues> = {}): ProcurementFormValues {
  return {
    ...emptyProcurementForm(),
    title_en: 'Rate update',
    procurement_update_type_id: 'pt1',
    ...overrides,
  };
}

describe('buildProcurementPayload', () => {
  it('emits only keys the backend validator accepts (no unknown keys)', () => {
    const p = buildProcurementPayload(values());
    for (const key of Object.keys(p)) {
      expect(BACKEND_KEYS.has(key), `unexpected key: ${key}`).toBe(true);
    }
  });

  it('uses backend summary_*/description_* fields — never short_description_*', () => {
    const p = buildProcurementPayload(
      values({ summary_en: 'Sum', summary_hi: 'सार', description_en: 'Desc', description_hi: 'विवरण' }),
    ) as Record<string, unknown>;
    expect(p.summary_en).toBe('Sum');
    expect(p.summary_hi).toBe('सार');
    expect(p.description_en).toBe('Desc');
    expect(p.description_hi).toBe('विवरण');
    expect(p).not.toHaveProperty('short_description_en');
    expect(p).not.toHaveProperty('short_description_hi');
  });

  it('sends rate as a number (not a string)', () => {
    const p = buildProcurementPayload(values({ rate: '250.50' }));
    expect(p.rate).toBe(250.5);
    expect(typeof p.rate).toBe('number');
  });

  it('sends rate as null when blank or non-numeric', () => {
    expect(buildProcurementPayload(values({ rate: '' })).rate).toBeNull();
    expect(buildProcurementPayload(values({ rate: '  ' })).rate).toBeNull();
    expect(buildProcurementPayload(values({ rate: 'abc' })).rate).toBeNull();
  });

  it('coerces empty master ids to null (never an empty-string uuid)', () => {
    const p = buildProcurementPayload(values({ commodity_id: '', district_id: '', block_id: '' }));
    expect(p.commodity_id).toBeNull();
    expect(p.district_id).toBeNull();
    expect(p.block_id).toBeNull();
  });

  it('passes selected master ids through', () => {
    const p = buildProcurementPayload(values({ commodity_id: 'c1', district_id: 'd1', block_id: 'b1' }));
    expect(p.commodity_id).toBe('c1');
    expect(p.district_id).toBe('d1');
    expect(p.block_id).toBe('b1');
  });

  it('keeps period dates as YYYY-MM-DD calendar dates', () => {
    const p = buildProcurementPayload(values({ period_start: '2026-01-01', period_end: '2026-03-31' }));
    expect(p.period_start).toBe('2026-01-01');
    expect(p.period_end).toBe('2026-03-31');
  });

  it('never produces server-managed fields', () => {
    const p = buildProcurementPayload(values()) as Record<string, unknown>;
    expect(p.slug).toBeUndefined();
    expect(p.publication_state).toBeUndefined();
    expect(p.created_by).toBeUndefined();
  });

  it('sends quantity as a number (KG) when entered', () => {
    const p = buildProcurementPayload(values({ quantity: '50000' }));
    expect(p.quantity).toBe(50000);
    expect(typeof p.quantity).toBe('number');
  });

  it('sends quantity as null when blank or non-numeric', () => {
    expect(buildProcurementPayload(values({ quantity: '' })).quantity).toBeNull();
    expect(buildProcurementPayload(values({ quantity: '  ' })).quantity).toBeNull();
    expect(buildProcurementPayload(values({ quantity: 'abc' })).quantity).toBeNull();
  });

  it('passes display_quantity_as_mt boolean through unchanged', () => {
    expect(buildProcurementPayload(values({ display_quantity_as_mt: true })).display_quantity_as_mt).toBe(true);
    expect(buildProcurementPayload(values({ display_quantity_as_mt: false })).display_quantity_as_mt).toBe(false);
  });
});
