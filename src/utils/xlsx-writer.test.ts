/**
 * Unit tests — xlsx-writer utility.
 * Verifies that writeXlsx() returns a valid XLSX (Office Open XML ZIP) buffer
 * containing the expected worksheet content without a real file write.
 */
import { describe, it, expect } from 'vitest';
import { writeXlsx } from './xlsx-writer';
import { unzipSync, strFromU8 } from 'fflate';

function unzipBuffer(buf: Buffer): Record<string, string> {
  const map = unzipSync(new Uint8Array(buf));
  const out: Record<string, string> = {};
  for (const [name, bytes] of Object.entries(map)) {
    out[name] = strFromU8(bytes);
  }
  return out;
}

describe('writeXlsx', () => {
  it('returns a Buffer', () => {
    const buf = writeXlsx([['A', 'B'], ['1', '2']]);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  it('produces a valid ZIP archive (starts with PK signature)', () => {
    const buf = writeXlsx([['Name', 'Value'], ['Ramesh', '42']]);
    // ZIP files start with PK (0x50 0x4B)
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });

  it('contains required OOXML entry paths', () => {
    const files = unzipBuffer(writeXlsx([['Header'], ['Value']]));
    expect(files['[Content_Types].xml']).toBeDefined();
    expect(files['_rels/.rels']).toBeDefined();
    expect(files['xl/workbook.xml']).toBeDefined();
    expect(files['xl/worksheets/sheet1.xml']).toBeDefined();
    expect(files['xl/sharedStrings.xml']).toBeDefined();
  });

  it('includes header row values in shared strings', () => {
    const files = unzipBuffer(writeXlsx([['Name', 'Email', 'Mobile']]));
    const ss = files['xl/sharedStrings.xml'];
    expect(ss).toContain('Name');
    expect(ss).toContain('Email');
    expect(ss).toContain('Mobile');
  });

  it('includes data row values in shared strings', () => {
    const files = unzipBuffer(writeXlsx([['Name'], ['Ramesh Kumar']]));
    const ss = files['xl/sharedStrings.xml'];
    expect(ss).toContain('Ramesh Kumar');
  });

  it('escapes XML special characters in cell values', () => {
    const files = unzipBuffer(writeXlsx([['Notes'], ['Fish & Chips <order>']]) );
    const ss = files['xl/sharedStrings.xml'];
    expect(ss).toContain('Fish &amp; Chips &lt;order&gt;');
    expect(ss).not.toContain('Fish & Chips');
  });

  it('handles an empty grid (no rows)', () => {
    const buf = writeXlsx([]);
    expect(buf).toBeInstanceOf(Buffer);
    const files = unzipBuffer(buf);
    const sheet = files['xl/worksheets/sheet1.xml'];
    expect(sheet).toContain('<sheetData>');
    expect(sheet).toContain('</sheetData>');
    expect(sheet).not.toContain('<row');
  });

  it('handles a single-cell grid', () => {
    const files = unzipBuffer(writeXlsx([['Hello']]));
    const sheet = files['xl/worksheets/sheet1.xml'];
    expect(sheet).toContain('<row r="1">');
    expect(sheet).toContain('r="A1"');
  });

  it('assigns correct column letters beyond Z', () => {
    // 27th column (index 26) should be 'AA'
    const headers = Array.from({ length: 27 }, (_, i) => `Col${i + 1}`);
    const files = unzipBuffer(writeXlsx([headers]));
    const sheet = files['xl/worksheets/sheet1.xml'];
    expect(sheet).toContain('r="AA1"');
  });

  it('stores each unique value only once in shared strings', () => {
    const files = unzipBuffer(writeXlsx([['A', 'B', 'A'], ['A', 'A', 'A']]));
    const ss = files['xl/sharedStrings.xml'];
    // 'A' and 'B' appear as shared strings — count occurrences in si elements
    const siCount = (ss.match(/<si>/g) ?? []).length;
    expect(siCount).toBe(2); // 'A' and 'B' only
  });

  it('content type for sheet is correct OOXML mime type', () => {
    const files = unzipBuffer(writeXlsx([['Test']]));
    const ct = files['[Content_Types].xml'];
    expect(ct).toContain('spreadsheetml.sheet.main+xml');
    expect(ct).toContain('spreadsheetml.worksheet+xml');
    expect(ct).toContain('spreadsheetml.sharedStrings+xml');
  });
});

describe('writeXlsx — typed cells', () => {
  it('writes a numeric cell as an untyped numeric <c> (no t="s")', () => {
    const files = unzipBuffer(writeXlsx([{ name: 'Sheet1', rows: [[42]] }]));
    const sheet = files['xl/worksheets/sheet1.xml'];
    expect(sheet).toContain('<c r="A1"><v>42</v></c>');
  });

  it('writes a Date cell as a numeric serial with the date style index', () => {
    const d = new Date('2024-01-01T00:00:00Z');
    const files = unzipBuffer(writeXlsx([{ name: 'Sheet1', rows: [[d]] }]));
    const sheet = files['xl/worksheets/sheet1.xml'];
    // Excel serial for 2024-01-01 is 45292.
    expect(sheet).toContain('<c r="A1" s="1"><v>45292</v></c>');
  });

  it('declares a date number format in styles.xml', () => {
    const files = unzipBuffer(writeXlsx([{ name: 'Sheet1', rows: [[new Date()]] }]));
    expect(files['xl/styles.xml']).toContain('formatCode="yyyy-mm-dd"');
  });

  it('renders null/undefined cells as empty string cells', () => {
    const files = unzipBuffer(writeXlsx([{ name: 'Sheet1', rows: [[null, undefined]] }]));
    const sheet = files['xl/worksheets/sheet1.xml'];
    expect(sheet).toContain('t="s"');
  });
});

describe('writeXlsx — multiple sheets', () => {
  it('writes each named sheet to its own worksheet part', () => {
    const files = unzipBuffer(
      writeXlsx([
        { name: 'Summary', rows: [['A']] },
        { name: 'Data', rows: [['B']] },
      ]),
    );
    expect(files['xl/worksheets/sheet1.xml']).toContain('A');
    expect(files['xl/worksheets/sheet2.xml']).toBeDefined();
    expect(files['xl/workbook.xml']).toContain('name="Summary"');
    expect(files['xl/workbook.xml']).toContain('name="Data"');
  });

  it('shares one sharedStrings table across all sheets', () => {
    const files = unzipBuffer(
      writeXlsx([
        { name: 'S1', rows: [['Repeated']] },
        { name: 'S2', rows: [['Repeated']] },
      ]),
    );
    const siCount = (files['xl/sharedStrings.xml'].match(/<si>/g) ?? []).length;
    expect(siCount).toBe(1);
  });
});

describe('writeXlsx — formula-injection neutralization', () => {
  it.each([
    ['=SUM(A1:A2)', "'=SUM(A1:A2)"],
    ['+1+1', "'+1+1"],
    ['-1+1', "'-1+1"],
    ['@cmd', "'@cmd"],
    ['\tsneaky', "'\tsneaky"],
    ['\rsneaky', "'\rsneaky"],
  ])('prefixes a leading quote for %s', (input, expected) => {
    const files = unzipBuffer(writeXlsx([{ name: 'Sheet1', rows: [[input]] }]));
    const ss = files['xl/sharedStrings.xml'];
    expect(ss).toContain(xmlEscapeForAssert(expected));
  });

  it('leaves an ordinary string untouched', () => {
    const files = unzipBuffer(writeXlsx([{ name: 'Sheet1', rows: [['Ramesh Kumar']] }]));
    expect(files['xl/sharedStrings.xml']).toContain('Ramesh Kumar');
  });

  it('still neutralizes formula-like strings via the legacy string[][] call shape', () => {
    const files = unzipBuffer(writeXlsx([['=cmd|calc']]));
    expect(files['xl/sharedStrings.xml']).toContain('&apos;=cmd|calc');
  });
});

function xmlEscapeForAssert(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;');
}
