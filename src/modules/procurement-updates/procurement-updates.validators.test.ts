/**
 * Unit tests — procurement-update validators (shape, required fields, quantity + MT flag).
 * DB-free; exercises the Zod schemas directly.
 */
import { describe, it, expect } from 'vitest';
import { validateProcurementUpdateCreate, validateProcurementUpdateUpdate } from './procurement-updates.validators';
import { ValidationError } from '@/shared/errors';

const TYPE_ID = '11111111-1111-4111-8111-111111111111';

function tryCreate(body: Record<string, unknown>): ValidationError | null {
  try {
    validateProcurementUpdateCreate(body);
    return null;
  } catch (err) {
    return err as ValidationError;
  }
}

describe('validateProcurementUpdateCreate — required fields', () => {
  it('accepts a minimal valid payload', () => {
    const out = validateProcurementUpdateCreate({
      title_en: 'Lac Rate Update',
      procurement_update_type_id: TYPE_ID,
    });
    expect(out.title_en).toBe('Lac Rate Update');
  });

  it('rejects a missing title_en', () => {
    const err = tryCreate({ procurement_update_type_id: TYPE_ID });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err?.fields).toHaveProperty('title_en');
  });

  it('rejects a missing procurement_update_type_id', () => {
    const err = tryCreate({ title_en: 'X' });
    expect(err?.fields).toHaveProperty('procurement_update_type_id');
  });

  it('rejects unknown fields (strict schema)', () => {
    const err = tryCreate({ title_en: 'X', procurement_update_type_id: TYPE_ID, bogus: true });
    expect(err).toBeInstanceOf(ValidationError);
  });
});

describe('validateProcurementUpdateCreate — quantity field (Task 10)', () => {
  it('accepts a valid quantity in KG', () => {
    const out = validateProcurementUpdateCreate({
      title_en: 'Achievement',
      procurement_update_type_id: TYPE_ID,
      quantity: 50000,
      display_quantity_as_mt: true,
    });
    expect(out.quantity).toBe(50000);
    expect(out.display_quantity_as_mt).toBe(true);
  });

  it('accepts quantity: 0 (zero procurement)', () => {
    const out = validateProcurementUpdateCreate({
      title_en: 'X',
      procurement_update_type_id: TYPE_ID,
      quantity: 0,
    });
    expect(out.quantity).toBe(0);
  });

  it('accepts quantity: null (not an achievement update)', () => {
    const out = validateProcurementUpdateCreate({
      title_en: 'X',
      procurement_update_type_id: TYPE_ID,
      quantity: null,
    });
    expect(out.quantity).toBeNull();
  });

  it('rejects a negative quantity', () => {
    const err = tryCreate({ title_en: 'X', procurement_update_type_id: TYPE_ID, quantity: -1 });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err?.fields).toHaveProperty('quantity');
  });

  it('display_quantity_as_mt defaults to undefined (omitted) when not sent', () => {
    const out = validateProcurementUpdateCreate({
      title_en: 'X',
      procurement_update_type_id: TYPE_ID,
    });
    expect(out.display_quantity_as_mt).toBeUndefined();
  });
});

describe('validateProcurementUpdateUpdate — partial update allows quantity alone', () => {
  it('accepts quantity patch without other fields', () => {
    const out = validateProcurementUpdateUpdate({ quantity: 1234.56 });
    expect(out.quantity).toBe(1234.56);
  });

  it('accepts display_quantity_as_mt patch alone', () => {
    const out = validateProcurementUpdateUpdate({ display_quantity_as_mt: false });
    expect(out.display_quantity_as_mt).toBe(false);
  });
});
