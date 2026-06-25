/** Unit tests — distribution summary validators. DB-free. */
import { describe, it, expect } from 'vitest';
import { validateDistributionCreate, validateDistributionUpdate } from './toolkit-distributions.validators';
import { ValidationError } from '@/shared/errors';

const TOOLKIT = '11111111-1111-4111-8111-111111111111';
const ITEM_A = '22222222-2222-4222-8222-222222222222';
const ITEM_B = '33333333-3333-4333-8333-333333333333';

describe('validateDistributionCreate', () => {
  it('accepts a minimal summary (no items)', () => {
    const out = validateDistributionCreate({ toolkit_id: TOOLKIT, distribution_model: 'group' });
    expect(out.toolkit_id).toBe(TOOLKIT);
    expect(out.distribution_model).toBe('group');
  });

  it('accepts item lines with basis + quantities', () => {
    const out = validateDistributionCreate({
      toolkit_id: TOOLKIT,
      distribution_model: 'mixed',
      items: [{ toolkit_item_id: ITEM_A, distribution_basis: 'group', quantity_per_unit: 2, number_of_units_or_groups: 3 }],
    });
    expect(out.items).toHaveLength(1);
  });

  it('rejects an unknown distribution_model', () => {
    expect(() => validateDistributionCreate({ toolkit_id: TOOLKIT, distribution_model: 'everyone' })).toThrow(ValidationError);
  });

  it('rejects duplicate toolkit items in the distribution', () => {
    expect(() =>
      validateDistributionCreate({
        toolkit_id: TOOLKIT,
        distribution_model: 'group',
        items: [
          { toolkit_item_id: ITEM_A, distribution_basis: 'group' },
          { toolkit_item_id: ITEM_A, distribution_basis: 'group' },
        ],
      }),
    ).toThrow(ValidationError);
  });

  it('rejects a negative participants_covered', () => {
    expect(() =>
      validateDistributionCreate({ toolkit_id: TOOLKIT, distribution_model: 'group', participants_covered: -1 }),
    ).toThrow(ValidationError);
  });

  it('rejects unknown keys', () => {
    expect(() => validateDistributionCreate({ toolkit_id: TOOLKIT, distribution_model: 'group', foo: 1 })).toThrow(ValidationError);
  });
});

describe('validateDistributionUpdate', () => {
  it('rejects a client attempt to change toolkit_id (immutable identity)', () => {
    expect(() => validateDistributionUpdate({ toolkit_id: TOOLKIT })).toThrow(ValidationError);
  });

  it('accepts a partial item replacement', () => {
    const out = validateDistributionUpdate({ items: [{ toolkit_item_id: ITEM_B, distribution_basis: 'individual' }] });
    expect(out.items?.[0]?.toolkit_item_id).toBe(ITEM_B);
  });
});
