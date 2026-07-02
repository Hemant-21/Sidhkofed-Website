/**
 * Unit tests — master form payload builders and schemas.
 * Covers the default master form (name_en/name_hi/display_order) and the
 * specialised Financial Year form (label/start_date/end_date). DB-free.
 */
import { describe, it, expect } from 'vitest';
import {
  buildDefaultMasterPayload,
  buildFinancialYearPayload,
  defaultMasterSchema,
  financialYearSchema,
  emptyDefaultMasterForm,
  emptyFinancialYearForm,
  type DefaultMasterValues,
} from './master-form-payload';
import { MASTER_TYPES, findMasterType } from './types';

// ── Default master payload ────────────────────────────────────────────────────

describe('buildDefaultMasterPayload', () => {
  it('passes name_en through', () => {
    expect(buildDefaultMasterPayload({ name_en: 'Training', name_hi: '', display_order: '' }).name_en)
      .toBe('Training');
  });

  it('coerces empty name_hi to null', () => {
    expect(buildDefaultMasterPayload({ name_en: 'X', name_hi: '', display_order: '' }).name_hi).toBeNull();
    expect(buildDefaultMasterPayload({ name_en: 'X', name_hi: '  ', display_order: '' }).name_hi).toBeNull();
  });

  it('passes a non-empty name_hi through', () => {
    expect(buildDefaultMasterPayload({ name_en: 'X', name_hi: 'प्रशिक्षण', display_order: '' }).name_hi)
      .toBe('प्रशिक्षण');
  });

  it('coerces empty display_order to null', () => {
    expect(buildDefaultMasterPayload({ name_en: 'X', name_hi: '', display_order: '' }).display_order).toBeNull();
  });

  it('converts a numeric display_order string to a number', () => {
    expect(buildDefaultMasterPayload({ name_en: 'X', name_hi: '', display_order: '5' }).display_order).toBe(5);
    expect(typeof buildDefaultMasterPayload({ name_en: 'X', name_hi: '', display_order: '5' }).display_order)
      .toBe('number');
  });
});

describe('defaultMasterSchema validation', () => {
  function parse(v: unknown) { return defaultMasterSchema.safeParse(v); }

  it('accepts a minimal valid input', () => {
    expect(parse({ name_en: 'Lac' }).success).toBe(true);
  });

  it('rejects an empty name_en', () => {
    const r = parse({ name_en: '' });
    expect(r.success).toBe(false);
  });

  it('rejects name_en longer than 150 chars', () => {
    expect(parse({ name_en: 'a'.repeat(151) }).success).toBe(false);
  });
});

describe('emptyDefaultMasterForm', () => {
  it('returns a form-ready empty object', () => {
    const empty = emptyDefaultMasterForm();
    expect(empty).toMatchObject<DefaultMasterValues>({ name_en: '', name_hi: '', display_order: '' });
  });
});

// ── Financial Year payload ────────────────────────────────────────────────────

describe('buildFinancialYearPayload', () => {
  it('passes all three fields through unchanged', () => {
    const out = buildFinancialYearPayload({ label: '2025-2026', start_date: '2025-04-01', end_date: '2026-03-31' });
    expect(out).toEqual({ label: '2025-2026', start_date: '2025-04-01', end_date: '2026-03-31' });
  });
});

describe('financialYearSchema validation', () => {
  function parse(v: unknown) { return financialYearSchema.safeParse(v); }

  it('accepts a valid financial year', () => {
    expect(parse({ label: '2025-2026', start_date: '2025-04-01', end_date: '2026-03-31' }).success).toBe(true);
  });

  it('rejects a label that is not YYYY-YYYY format', () => {
    expect(parse({ label: '2025-26', start_date: '2025-04-01', end_date: '2026-03-31' }).success).toBe(false);
    expect(parse({ label: 'FY2025', start_date: '2025-04-01', end_date: '2026-03-31' }).success).toBe(false);
  });

  it('rejects a missing start_date', () => {
    expect(parse({ label: '2025-2026', start_date: '', end_date: '2026-03-31' }).success).toBe(false);
  });

  it('rejects end_date before start_date', () => {
    const r = parse({ label: '2025-2026', start_date: '2026-04-01', end_date: '2025-03-31' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.flatten().fieldErrors).toHaveProperty('end_date');
    }
  });

  it('accepts equal start and end dates (single-day range)', () => {
    expect(parse({ label: '2025-2026', start_date: '2025-04-01', end_date: '2025-04-01' }).success).toBe(true);
  });
});

describe('emptyFinancialYearForm', () => {
  it('returns empty strings for all fields', () => {
    expect(emptyFinancialYearForm()).toEqual({ label: '', start_date: '', end_date: '' });
  });
});

// ── MASTER_TYPES config contract ──────────────────────────────────────────────

describe('MASTER_TYPES configuration', () => {
  it('has exactly 16 master types', () => {
    expect(MASTER_TYPES).toHaveLength(16);
  });

  it('financial-years uses the financial-year form variant and has no display_order', () => {
    const fy = findMasterType('financial-years')!;
    expect(fy.formVariant).toBe('financial-year');
    expect(fy.hasDisplayOrder).toBe(false);
    expect(fy.defaultSort).toBe('label');
  });

  it('reporting-periods has no display_order and sorts by start_date', () => {
    const rp = findMasterType('reporting-periods')!;
    expect(rp.hasDisplayOrder).toBe(false);
    expect(rp.defaultSort).toBe('start_date');
  });

  it('blocks exposes district_id as a filter key', () => {
    const blocks = findMasterType('blocks')!;
    expect(blocks.filterKeys).toContain('district_id');
  });

  it('districts and blocks are seeded (read-only)', () => {
    expect(findMasterType('districts')?.editMode).toBe('seeded');
    expect(findMasterType('blocks')?.editMode).toBe('seeded');
  });

  it('all other masters are full-edit', () => {
    const seededKeys = new Set(['districts', 'blocks']);
    for (const m of MASTER_TYPES) {
      if (!seededKeys.has(m.key)) {
        expect(m.editMode, `${m.key} should be full`).toBe('full');
      }
    }
  });
});
