import { describe, expect, it } from 'vitest';
import { toRelationValue } from './relation-fields';

/**
 * Regression (Phase 15.6 audit — Issue 1). `<FormField>` surfaces a single-select id as the broad
 * union of every form field's value, so the RelationPicker `value` was inferring `(string | true)[]`.
 * `toRelationValue` narrows it safely (no casts) to the picker's `string[]` contract.
 */
describe('toRelationValue', () => {
  it('wraps a non-empty id in a single-element array', () => {
    expect(toRelationValue('abc')).toEqual(['abc']);
  });

  it('returns an empty array for empty / null / non-string values', () => {
    expect(toRelationValue('')).toEqual([]);
    expect(toRelationValue(null)).toEqual([]);
    expect(toRelationValue(undefined)).toEqual([]);
    expect(toRelationValue(true)).toEqual([]);
    expect(toRelationValue(42)).toEqual([]);
  });
});
