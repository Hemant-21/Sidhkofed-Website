import { describe, it, expect } from 'vitest';
import { parseCsvGrid, csvToRecords } from './csv';

describe('parseCsvGrid', () => {
  it('parses simple rows and skips blank lines', () => {
    expect(parseCsvGrid('a,b\n1,2\n\n3,4')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('handles quoted fields with embedded commas, newlines and doubled quotes', () => {
    const grid = parseCsvGrid('name,note\n"Doe, John","line1\nline2"\n"He said ""hi""",x');
    expect(grid[1]).toEqual(['Doe, John', 'line1\nline2']);
    expect(grid[2]).toEqual(['He said "hi"', 'x']);
  });

  it('strips a leading UTF-8 BOM', () => {
    expect(parseCsvGrid('﻿a,b\n1,2')[0]).toEqual(['a', 'b']);
  });
});

describe('csvToRecords', () => {
  it('keys data rows by the header and drops blank cells', () => {
    const { records, error } = csvToRecords([
      ['metric_key', 'label_en', 'value'],
      ['m1', 'Members', '10'],
      ['m2', 'Trend', ''],
    ]);
    expect(error).toBeNull();
    expect(records).toEqual([
      { metric_key: 'm1', label_en: 'Members', value: '10' },
      { metric_key: 'm2', label_en: 'Trend' },
    ]);
  });

  it('errors when there is no data row', () => {
    const { error } = csvToRecords([['metric_key', 'label_en']]);
    expect(error).toMatch(/header row and at least one data row/i);
  });
});
