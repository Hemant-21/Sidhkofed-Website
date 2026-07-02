/** Unit tests — distribution-item total-quantity auto-calculation. DB-free. */
import { describe, it, expect } from 'vitest';
import { computeTotalQuantity } from './toolkit-distributions.calc';

describe('computeTotalQuantity', () => {
  it('auto-calculates group total = quantity_per_unit * number_of_groups', () => {
    const total = computeTotalQuantity({
      manualOverride: false,
      totalQuantity: null,
      quantityPerUnit: 2.5,
      numberOfUnitsOrGroups: 4,
    });
    expect(total?.toString()).toBe('10');
  });

  it('auto-calculates individual total = quantity_per_unit * number_of_units', () => {
    const total = computeTotalQuantity({
      manualOverride: false,
      totalQuantity: null,
      quantityPerUnit: 1,
      numberOfUnitsOrGroups: 45,
    });
    expect(Number(total)).toBe(45);
  });

  it('returns the supplied total when manual_override is true (ignores the operands)', () => {
    const total = computeTotalQuantity({
      manualOverride: true,
      totalQuantity: 999,
      quantityPerUnit: 2,
      numberOfUnitsOrGroups: 2,
    });
    expect(Number(total)).toBe(999);
  });

  it('returns null when auto and an operand is missing', () => {
    expect(computeTotalQuantity({ manualOverride: false, totalQuantity: null, quantityPerUnit: 5, numberOfUnitsOrGroups: null })).toBeNull();
    expect(computeTotalQuantity({ manualOverride: false, totalQuantity: null, quantityPerUnit: null, numberOfUnitsOrGroups: 3 })).toBeNull();
  });

  it('returns null when manual_override is true but no total is supplied', () => {
    expect(computeTotalQuantity({ manualOverride: true, totalQuantity: null, quantityPerUnit: 1, numberOfUnitsOrGroups: 1 })).toBeNull();
  });
});
