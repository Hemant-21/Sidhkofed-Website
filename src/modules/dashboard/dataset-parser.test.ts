/**
 * Unit tests — dataset file parser (Issue 1). Cover CSV parsing (incl. quoted fields), XLSX parsing
 * (a real OOXML zip built with fflate, using shared strings + a numeric cell), template/header
 * validation, numeric coercion, blank-row skipping, and content-family mismatch rejection.
 */
import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { ValidationError } from '@/shared/errors';
import { parseCsv, parseDatasetFile, gridToRows } from './dataset-parser';

const CSV = 'text/csv';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Build a minimal but standards-shaped XLSX (shared strings + one numeric cell). */
function buildXlsx(): Buffer {
  const sharedStrings =
    '<?xml version="1.0"?><sst>' +
    '<si><t>metric_key</t></si>' +
    '<si><t>label_en</t></si>' +
    '<si><t>value</t></si>' +
    '<si><t>total_trainings</t></si>' +
    '<si><t>Total Trainings</t></si>' +
    '</sst>';
  const sheet =
    '<?xml version="1.0"?><worksheet><sheetData>' +
    '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row>' +
    '<row r="2"><c r="A2" t="s"><v>3</v></c><c r="B2" t="s"><v>4</v></c><c r="C2"><v>120</v></c></row>' +
    '</sheetData></worksheet>';
  const zipped = zipSync({
    'xl/worksheets/sheet1.xml': strToU8(sheet),
    'xl/sharedStrings.xml': strToU8(sharedStrings),
  });
  return Buffer.from(zipped);
}

describe('parseCsv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
  it('handles quoted fields with embedded commas and doubled quotes', () => {
    expect(parseCsv('x\n"A, B"\n"say ""hi"""')).toEqual([['x'], ['A, B'], ['say "hi"']]);
  });
  it('treats CRLF as a single line break', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('parseDatasetFile — CSV', () => {
  it('maps a CSV sheet to typed row objects with numeric coercion', () => {
    const rows = parseDatasetFile(
      Buffer.from('metric_key,label_en,value\ntotal_trainings,Total Trainings,120\n'),
      CSV,
    );
    expect(rows).toEqual([{ metric_key: 'total_trainings', label_en: 'Total Trainings', value: 120 }]);
  });
  it('keeps a non-numeric value as a string so the row validator flags it downstream', () => {
    const rows = parseDatasetFile(Buffer.from('metric_key,label_en,value\nk,K,abc\n'), CSV);
    expect(rows[0].value).toBe('abc');
  });
  it('skips blank trailing rows', () => {
    const rows = parseDatasetFile(Buffer.from('metric_key,label_en,value\nk,K,1\n,,\n'), CSV);
    expect(rows).toHaveLength(1);
  });
});

describe('parseDatasetFile — XLSX', () => {
  it('parses a real XLSX zip (shared strings + numeric cell)', () => {
    const rows = parseDatasetFile(buildXlsx(), XLSX);
    expect(rows).toEqual([{ metric_key: 'total_trainings', label_en: 'Total Trainings', value: 120 }]);
  });
  it('rejects an XLSX MIME whose bytes are not a ZIP container', () => {
    expect(() => parseDatasetFile(Buffer.from('not a zip'), XLSX)).toThrow(ValidationError);
  });
});

describe('gridToRows — template/header validation', () => {
  it('rejects a missing required column', () => {
    expect(() =>
      gridToRows([
        ['label_en', 'value'],
        ['K', '1'],
      ]),
    ).toThrow(ValidationError);
  });
  it('rejects an unknown column (approved template only)', () => {
    expect(() =>
      gridToRows([
        ['metric_key', 'label_en', 'bogus'],
        ['k', 'K', 'x'],
      ]),
    ).toThrow(ValidationError);
  });
  it('rejects a duplicate column', () => {
    expect(() =>
      gridToRows([
        ['metric_key', 'metric_key', 'label_en'],
        ['k', 'k', 'K'],
      ]),
    ).toThrow(ValidationError);
  });
});

describe('parseDatasetFile — content guards', () => {
  it('rejects a CSV containing NUL bytes (binary masquerading as text)', () => {
    expect(() => parseDatasetFile(Buffer.from([0x6b, 0x00, 0x6b]), CSV)).toThrow(ValidationError);
  });
  it('rejects an unsupported MIME type', () => {
    expect(() => parseDatasetFile(Buffer.from('a,b\n1,2'), 'application/pdf')).toThrow(ValidationError);
  });
  it('rejects an empty file', () => {
    expect(() => parseDatasetFile(Buffer.from(''), CSV)).toThrow(ValidationError);
  });
});
