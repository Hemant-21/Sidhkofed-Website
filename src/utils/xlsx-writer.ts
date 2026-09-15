/**
 * XLSX writer using `fflate` (already a project dependency for ZIP handling elsewhere).
 *
 * Generates a valid Office Open XML workbook via a hand-rolled OOXML/ZIP writer (no external XLSX
 * dependency). Supports:
 *   - Typed cells: string, number, and Date (dates are written as real numeric-serial date cells
 *     with a date number format, not text).
 *   - Multiple named sheets in one workbook.
 *   - Formula-injection neutralization: any STRING cell whose value starts with `=`, `+`, `-`, `@`,
 *     a tab, or a carriage return is prefixed with a leading `'` so Excel/Sheets never evaluates it
 *     as a formula when the file is opened. This applies automatically to every caller, including
 *     the pre-existing enquiries export.
 *
 * Backward compatible: the original `writeXlsx(rows: string[][])` call shape (a single grid of
 * string cells, rendered onto one sheet named "Sheet1") still works unchanged — see
 * `src/modules/enquiries/enquiries.controller.ts`, the one pre-existing call site.
 *
 * The XLSX format is a ZIP archive containing:
 *   _rels/.rels
 *   [Content_Types].xml
 *   xl/_rels/workbook.xml.rels
 *   xl/workbook.xml
 *   xl/styles.xml
 *   xl/sharedStrings.xml
 *   xl/worksheets/sheet1.xml, sheet2.xml, …
 */
import { zipSync, strToU8 } from 'fflate';

/** One cell's raw value. `null`/`undefined` render as an empty string cell. */
export type XlsxCellValue = string | number | Date | null | undefined;

/** One named worksheet's row grid, for the multi-sheet call shape. */
export interface XlsxSheet {
  name: string;
  rows: XlsxCellValue[][];
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Excel column letter(s) from a 0-based index (0=A, 25=Z, 26=AA, …). */
function colLetter(n: number): string {
  let s = '';
  n += 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * Leading characters that Excel/Google Sheets can interpret as the start of a formula when a cell
 * is opened as text. Prefixing the value with a literal `'` forces it to be treated as plain text.
 */
const FORMULA_TRIGGER_CHARS = new Set(['=', '+', '-', '@', '\t', '\r']);

function neutralizeFormula(value: string): string {
  if (value.length > 0 && FORMULA_TRIGGER_CHARS.has(value[0] as string)) {
    return `'${value}`;
  }
  return value;
}

/** Excel's date epoch is 1899-12-30 (the "1900 leap year bug" is already baked into this constant). */
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

function toExcelSerialDate(d: Date): number {
  return (d.getTime() - EXCEL_EPOCH_MS) / 86400000;
}

type NormalizedCell =
  | { kind: 'string'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'date'; value: number };

function normalizeCell(value: XlsxCellValue): NormalizedCell {
  if (value === null || value === undefined) return { kind: 'string', value: '' };
  if (value instanceof Date) return { kind: 'date', value: toExcelSerialDate(value) };
  if (typeof value === 'number') return { kind: 'number', value: Number.isFinite(value) ? value : 0 };
  return { kind: 'string', value: neutralizeFormula(String(value)) };
}

/** Accepts either the legacy single-grid shape or the new multi-sheet shape. */
function normalizeSheets(input: string[][] | XlsxSheet[]): { name: string; rows: NormalizedCell[][] }[] {
  const sheets: XlsxSheet[] =
    input.length === 0
      ? [{ name: 'Sheet1', rows: [] }]
      : Array.isArray(input[0])
        ? [{ name: 'Sheet1', rows: input as string[][] }]
        : (input as XlsxSheet[]);

  return sheets.map((sheet) => ({
    name: sheet.name,
    rows: sheet.rows.map((row) => row.map(normalizeCell)),
  }));
}

/** Build a shared-strings index so strings are stored once (smaller files), across all sheets. */
function buildSharedStrings(sheets: { rows: NormalizedCell[][] }[]): {
  index: Map<string, number>;
  xml: string;
} {
  const index = new Map<string, number>();
  let count = 0;
  for (const sheet of sheets) {
    for (const row of sheet.rows) {
      for (const cell of row) {
        if (cell.kind === 'string' && !index.has(cell.value)) {
          index.set(cell.value, count++);
        }
      }
    }
  }
  const sis = [...index.keys()]
    .map((s) => `<si><t xml:space="preserve">${xmlEscape(s)}</t></si>`)
    .join('');
  const total = index.size;
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${total}" uniqueCount="${total}">${sis}</sst>`;
  return { index, xml };
}

/** Style index used for date cells (declared in `STYLES_XML` below). */
const DATE_STYLE_INDEX = 1;

function buildSheetXml(rows: NormalizedCell[][], ssIndex: Map<string, number>): string {
  const rowXml = rows
    .map((cells, ri) => {
      const rowNum = ri + 1;
      const cellXml = cells
        .map((cell, ci) => {
          const ref = `${colLetter(ci)}${rowNum}`;
          if (cell.kind === 'string') {
            const si = ssIndex.get(cell.value) ?? 0;
            return `<c r="${ref}" t="s"><v>${si}</v></c>`;
          }
          if (cell.kind === 'date') {
            return `<c r="${ref}" s="${DATE_STYLE_INDEX}"><v>${cell.value}</v></c>`;
          }
          return `<c r="${ref}"><v>${cell.value}</v></c>`;
        })
        .join('');
      return `<row r="${rowNum}">${cellXml}</row>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowXml}</sheetData></worksheet>`;
}

function buildContentTypes(sheetCount: number): string {
  const sheetOverrides = Array.from(
    { length: sheetCount },
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  ${sheetOverrides}
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;
}

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

/** Minimal styles part: index 0 = default (General), index 1 = date (`yyyy-mm-dd`). */
const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/></numFmts>
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
  </cellXfs>
</styleSheet>`;

function buildWorkbookXml(sheetNames: string[]): string {
  const sheetsXml = sheetNames
    .map((name, i) => `<sheet name="${xmlEscape(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetsXml}</sheets>
</workbook>`;
}

function buildWorkbookRels(sheetCount: number): string {
  const sheetRels = Array.from(
    { length: sheetCount },
    (_, i) =>
      `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
  ).join('');
  const sharedStringsId = sheetCount + 1;
  const stylesId = sheetCount + 2;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRels}
  <Relationship Id="rId${sharedStringsId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
  <Relationship Id="rId${stylesId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

/**
 * Convert either a single grid of string cells (legacy shape) or a list of named, typed sheets to a
 * valid XLSX `Buffer`. The first row of each sheet is treated as the header row by Excel — no
 * special markup is added. String cells that look like formulas are neutralized (see module docs).
 */
export function writeXlsx(input: string[][] | XlsxSheet[]): Buffer {
  const sheets = normalizeSheets(input);
  const { index: ssIndex, xml: ssXml } = buildSharedStrings(sheets);

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(buildContentTypes(sheets.length)),
    '_rels/.rels': strToU8(ROOT_RELS),
    'xl/workbook.xml': strToU8(buildWorkbookXml(sheets.map((s) => s.name))),
    'xl/_rels/workbook.xml.rels': strToU8(buildWorkbookRels(sheets.length)),
    'xl/styles.xml': strToU8(STYLES_XML),
    'xl/sharedStrings.xml': strToU8(ssXml),
  };
  sheets.forEach((sheet, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(buildSheetXml(sheet.rows, ssIndex));
  });

  return Buffer.from(zipSync(files));
}
