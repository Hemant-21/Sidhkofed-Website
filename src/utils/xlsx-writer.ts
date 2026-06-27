/**
 * Minimal XLSX writer using `fflate` (already a project dependency via dataset-parser).
 *
 * Generates a valid Office Open XML workbook with a single worksheet. This is intentionally
 * minimal — it only handles string cell values (no formulas, styles, or merged cells). That
 * is sufficient for the enquiry export which contains only text and date strings.
 *
 * The XLSX format is a ZIP archive containing:
 *   _rels/.rels
 *   [Content_Types].xml
 *   xl/_rels/workbook.xml.rels
 *   xl/workbook.xml
 *   xl/sharedStrings.xml
 *   xl/worksheets/sheet1.xml
 */
import { zipSync, strToU8 } from 'fflate';

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

/** Build a shared-strings index so strings are stored once (smaller files). */
function buildSharedStrings(rows: string[][]): { index: Map<string, number>; xml: string } {
  const index = new Map<string, number>();
  let count = 0;
  for (const row of rows) {
    for (const cell of row) {
      if (!index.has(cell)) {
        index.set(cell, count++);
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

function buildSheet(rows: string[][], ssIndex: Map<string, number>): string {
  const rowXml = rows
    .map((cells, ri) => {
      const rowNum = ri + 1;
      const cellXml = cells
        .map((cell, ci) => {
          const ref = `${colLetter(ci)}${rowNum}`;
          const si = ssIndex.get(cell) ?? 0;
          return `<c r="${ref}" t="s"><v>${si}</v></c>`;
        })
        .join('');
      return `<row r="${rowNum}">${cellXml}</row>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowXml}</sheetData></worksheet>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const WORKBOOK_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

/**
 * Convert a 2-D array of strings to a valid XLSX `Buffer`.
 * The first row is treated as the header row by Excel — no special markup is added.
 */
export function writeXlsx(rows: string[][]): Buffer {
  const { index: ssIndex, xml: ssXml } = buildSharedStrings(rows);
  const sheetXml = buildSheet(rows, ssIndex);

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(CONTENT_TYPES),
    '_rels/.rels': strToU8(ROOT_RELS),
    'xl/workbook.xml': strToU8(WORKBOOK_XML),
    'xl/_rels/workbook.xml.rels': strToU8(WORKBOOK_RELS),
    'xl/sharedStrings.xml': strToU8(ssXml),
    'xl/worksheets/sheet1.xml': strToU8(sheetXml),
  };

  return Buffer.from(zipSync(files));
}
