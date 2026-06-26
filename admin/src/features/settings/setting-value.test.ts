import { describe, it, expect } from 'vitest';
import { inferKind, toInputString, coerceValue } from './setting-value';

describe('settings value helpers', () => {
  it('infers the control from the value type', () => {
    expect(inferKind(true)).toBe('boolean');
    expect(inferKind(8)).toBe('number');
    expect(inferKind('SIDHKOFED')).toBe('text');
    expect(inferKind(null)).toBe('text');
  });

  it('renders values as input strings', () => {
    expect(toInputString('hello')).toBe('hello');
    expect(toInputString(8)).toBe('8');
    expect(toInputString(null)).toBe('');
    expect(toInputString(['a', 'b'])).toBe('["a","b"]');
  });

  it('coerces edited strings back to the original type', () => {
    expect(coerceValue('12', 8)).toBe(12);
    expect(coerceValue('not-a-number', 8)).toBe('not-a-number');
    expect(coerceValue('["x"]', ['a'])).toEqual(['x']);
    expect(coerceValue('', null)).toBeNull();
    expect(coerceValue('SIDHKOFED', 'OLD')).toBe('SIDHKOFED');
  });
});
