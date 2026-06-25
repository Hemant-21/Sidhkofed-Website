/** Unit tests — toolkit item validators. DB-free. */
import { describe, it, expect } from 'vitest';
import { validateToolkitItemCreate, validateToolkitItemUpdate } from './items.validators';
import { ValidationError } from '@/shared/errors';

describe('validateToolkitItemCreate', () => {
  it('accepts a minimal individual item', () => {
    const out = validateToolkitItemCreate({ name_en: 'Pruning Secateur' });
    expect(out.name_en).toBe('Pruning Secateur');
  });

  it('accepts a group item with a group size', () => {
    const out = validateToolkitItemCreate({
      name_en: 'Lac Brood',
      distribution_basis: 'group',
      default_group_size: 10,
      default_quantity_per_unit: 2,
    });
    expect(out.distribution_basis).toBe('group');
  });

  it('requires default_group_size when basis is group', () => {
    expect(() => validateToolkitItemCreate({ name_en: 'Lac Brood', distribution_basis: 'group' })).toThrow(ValidationError);
  });

  it('rejects negative quantities', () => {
    expect(() => validateToolkitItemCreate({ name_en: 'X', default_quantity_per_unit: -1 })).toThrow(ValidationError);
    expect(() => validateToolkitItemCreate({ name_en: 'X', quantity_summary: -5 })).toThrow(ValidationError);
  });

  it('rejects an unknown distribution basis', () => {
    expect(() => validateToolkitItemCreate({ name_en: 'X', distribution_basis: 'household' })).toThrow(ValidationError);
  });

  it('rejects unknown keys', () => {
    expect(() => validateToolkitItemCreate({ name_en: 'X', foo: 1 })).toThrow(ValidationError);
  });
});

describe('validateToolkitItemUpdate', () => {
  it('allows a partial update without re-checking group size (merged-state check is in the service)', () => {
    expect(validateToolkitItemUpdate({ distribution_basis: 'group' }).distribution_basis).toBe('group');
  });

  it('still rejects negative quantities on update', () => {
    expect(() => validateToolkitItemUpdate({ default_quantity_per_unit: -2 })).toThrow(ValidationError);
  });
});
