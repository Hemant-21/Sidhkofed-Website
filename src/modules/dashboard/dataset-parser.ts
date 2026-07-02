/**
 * Server-side dataset file parser (Issue 1 — HIGH). Parses an uploaded CSV or XLSX sheet into plain
 * row objects keyed by the approved template columns, then hands them to the SHARED row validator in
 * the dataset service (no row-validation logic is duplicated here — this layer only turns bytes into
 * candidate rows). XLSX is unzipped with `fflate` (zero-dependency) and read from the standard OOXML
 * worksheet + shared-strings parts; CSV is parsed with an RFC-4180-correct scanner (quoted fields,
 * embedded commas/newlines, doubled-quote escaping).
 *
 * The dashboard import is template-driven (requirements §"Excel Import" — "Support only approved
 * templates"): the header row must contain the required columns and no unknown columns, otherwise the
 * whole upload is rejected with a header-level 422 (never a partial/ambiguous import).
 */
import { unzipSync, strFromU8 } from 'fflate';
import { ValidationError } from '@/shared/errors';
import { detectFamily } from '@/modules/media/media.validation';

/** Approved template columns (must match dataset-row validator field names). */
export const REQUIRED_COLUMNS = ['metric_key', 'label_en'] as const;
export const ALLOWED_COLUMNS = [
  'metric_key',
  'label_en',
  'label_hi',
  'value',
  'value_text',
  'unit',
  'display_order',
] as const;

/** Columns whose cell text is coerced to a number (so the numeric row validator can run). */
const NUMERIC_COLUMNS = new Set<string>(['value', 'display_order']);

// ── CSV ──────────────────────────────────────────────────────────────────────────
/** RFC-4180 scanner → grid of string cells. Handles quotes, embedded delimiters, CRLF. */
export function parseCsv(text: string): string[][] {
  // Strip a leading UTF-8 BOM if present.
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = input.length;

  const endField = (): void => {
    row.push(field);
    field = '';
  };
  const endRow = (): void => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < n) {
    const ch = input[i] as string;
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      endField();
      i += 1;
      continue;
    }
    if (ch === '\r') {
      // swallow CRLF / CR as one line break
      if (input[i + 1] === '\n') i += 1;
      endRow();
      i += 1;
      continue;
    }
    if (ch === '\n') {
      endRow();
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  // Flush the final field/row unless the input ended exactly on a line break.
  if (field.length > 0 || row.length > 0) endRow();
  return rows;
}

// ── XLSX ───────────────────────────────────────────────────────────────────────
/** Convert a cell reference's column letters (e.g. "AB12") to a zero-based column index. */
function columnIndex(ref: string): number {
  let idx = 0;
  for (const ch of ref) {
    const code = ch.charCodeAt(0);
    if (code < 65 || code > 90) break; // stop at the first digit
    idx = idx * 26 + (code - 64);
  }
  return idx - 1;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&'); // last, so a literal "&amp;amp;" decodes correctly
}

/** Concatenate every <t>…</t> run inside a shared-string / inline-string element. */
function readTextRuns(xml: string): string {
  let out = '';
  const re = /<t[^>]*>([\s\S]*?)<\/t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out += decodeXmlEntities(m[1] as string);
  return out;
}

function parseSharedStrings(xml: string | undefined): string[] {
  if (!xml) return [];
  const out: string[] = [];
  const re = /<si>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(readTextRuns(m[1] as string));
  return out;
}

/** Parse the first worksheet's cells into a grid of string values. */
function parseSheet(xml: string, shared: string[]): string[][] {
  const grid: string[][] = [];
  const rowRe = /<row[^>]*>([\s\S]*?)<\/row>/g;
  let rm: RegExpExecArray | null;
  while ((rm = rowRe.exec(xml)) !== null) {
    const rowXml = rm[1] as string;
    const cells: string[] = [];
    const cellRe = /<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm: RegExpExecArray | null;
    while ((cm = cellRe.exec(rowXml)) !== null) {
      const attrs = cm[1] as string;
      const body = (cm[2] as string | undefined) ?? '';
      const refMatch = /\br="([A-Z]+)\d+"/.exec(attrs);
      const typeMatch = /\bt="([^"]+)"/.exec(attrs);
      const type = typeMatch ? typeMatch[1] : undefined;
      const col = refMatch ? columnIndex(refMatch[1] as string) : cells.length;

      let value = '';
      if (type === 'inlineStr') {
        value = readTextRuns(body);
      } else {
        const vMatch = /<v>([\s\S]*?)<\/v>/.exec(body);
        const raw = vMatch ? decodeXmlEntities(vMatch[1] as string) : '';
        if (type === 's') value = shared[Number(raw)] ?? '';
        else if (type === 'b') value = raw === '1' ? 'TRUE' : 'FALSE';
        else value = raw; // number, date serial, or formula string
      }
      cells[col] = value;
    }
    // Normalize sparse arrays (gaps from skipped columns) to empty strings.
    for (let k = 0; k < cells.length; k += 1) if (cells[k] === undefined) cells[k] = '';
    grid.push(cells);
  }
  return grid;
}

/** Find the lowest-numbered worksheet part in the unzipped archive. */
function firstSheetPath(files: Record<string, Uint8Array>): string | null {
  const sheets = Object.keys(files)
    .filter((p) => /^xl\/worksheets\/sheet\d+\.xml$/.test(p))
    .sort((a, b) => {
      const na = Number(/sheet(\d+)\.xml$/.exec(a)?.[1] ?? 0);
      const nb = Number(/sheet(\d+)\.xml$/.exec(b)?.[1] ?? 0);
      return na - nb;
    });
  return sheets[0] ?? null;
}

export function parseXlsx(buffer: Buffer): string[][] {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(buffer));
  } catch {
    throw new ValidationError({ file: ['The spreadsheet could not be read (corrupt XLSX).'] });
  }
  const sheetPath = firstSheetPath(files);
  if (!sheetPath || !files[sheetPath]) {
    throw new ValidationError({ file: ['The spreadsheet has no readable worksheet.'] });
  }
  const shared = parseSharedStrings(
    files['xl/sharedStrings.xml'] ? strFromU8(files['xl/sharedStrings.xml']) : undefined,
  );
  return parseSheet(strFromU8(files[sheetPath]), shared);
}

// ── Grid → row objects ──────────────────────────────────────────────────────────
function isBlankRow(cells: string[]): boolean {
  return cells.every((c) => (c ?? '').trim() === '');
}

/**
 * Turn a parsed grid into candidate row objects keyed by the template headers. Validates the header
 * row up-front (required + no unknown columns); coerces numeric columns so the shared row validator
 * sees a number. Blank trailing rows are skipped. The returned objects are validated downstream by
 * the dataset service's row schema — no duplicate validation here.
 */
export function gridToRows(grid: string[][]): Array<Record<string, unknown>> {
  const headerRowIndex = grid.findIndex((r) => !isBlankRow(r));
  if (headerRowIndex === -1) {
    throw new ValidationError({ file: ['The file contains no rows.'] });
  }
  const headers = (grid[headerRowIndex] as string[]).map((h) => (h ?? '').trim());

  const headerErrors: string[] = [];
  const seen = new Set<string>();
  headers.forEach((h) => {
    if (h === '') return; // ignore an empty trailing header cell
    if (!(ALLOWED_COLUMNS as readonly string[]).includes(h))
      headerErrors.push(`Unknown column "${h}".`);
    if (seen.has(h)) headerErrors.push(`Duplicate column "${h}".`);
    seen.add(h);
  });
  for (const required of REQUIRED_COLUMNS) {
    if (!seen.has(required)) headerErrors.push(`Missing required column "${required}".`);
  }
  if (headerErrors.length > 0) throw new ValidationError({ headers: headerErrors });

  const rows: Array<Record<string, unknown>> = [];
  for (let r = headerRowIndex + 1; r < grid.length; r += 1) {
    const cells = grid[r] as string[];
    if (isBlankRow(cells)) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((header, c) => {
      if (header === '') return;
      const raw = (cells[c] ?? '').trim();
      if (raw === '') return; // omit empty cells → optional fields stay undefined
      if (NUMERIC_COLUMNS.has(header)) {
        const num = Number(raw);
        obj[header] = Number.isNaN(num) ? raw : num; // keep bad text so the row validator flags it
      } else {
        obj[header] = raw;
      }
    });
    rows.push(obj);
  }
  return rows;
}

/**
 * Validate the uploaded file's content family matches its declared dataset MIME, then parse it into
 * candidate rows. CSV must be valid UTF-8 text (no NUL bytes); XLSX must be a real ZIP container.
 */
export function parseDatasetFile(buffer: Buffer, mime: string): Array<Record<string, unknown>> {
  if (buffer.byteLength === 0) throw new ValidationError({ file: ['File is empty.'] });

  if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    if (detectFamily(buffer) !== 'zip') {
      throw new ValidationError({
        file: ['File content is not a valid XLSX (expected a ZIP container).'],
      });
    }
    return gridToRows(parseXlsx(buffer));
  }
  if (mime === 'text/csv') {
    if (buffer.includes(0x00)) {
      throw new ValidationError({ file: ['File content is not valid CSV text.'] });
    }
    return gridToRows(parseCsv(buffer.toString('utf8')));
  }
  throw new ValidationError({ file: [`Unsupported dataset type "${mime}". Use CSV or XLSX.`] });
}
