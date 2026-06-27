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
