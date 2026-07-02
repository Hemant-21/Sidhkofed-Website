/**
 * Tiny, dependency-free CSV helpers (RFC-4180-lite) shared by the bulk-import surfaces
 * (membership bulk upload, dashboard manual dataset). These do ONLY the mechanical text → records
 * transform — never any business validation. Every imported row is validated server-side, which
 * remains the single source of truth.
 */

/** Scan CSV text into a grid of string cells (quoted fields, doubled-quote escaping, CRLF). */
export function parseCsvGrid(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.trim() !== '')) rows.push(row);
  }
  return rows;
}

/**
 * Turn a parsed grid into header-keyed record objects. The first row is the header; blank cells are
 * dropped (so the backend applies its defaults). Returns an error string when there is no data row.
 */
export function csvToRecords(grid: string[][]): {
  records: Array<Record<string, string>>;
  error: string | null;
} {
  if (grid.length < 2) {
    return { records: [], error: 'Provide a header row and at least one data row.' };
  }
  const header = grid[0]!.map((h) => h.trim());
  const records: Array<Record<string, string>> = [];
  for (let r = 1; r < grid.length; r += 1) {
    const cells = grid[r]!;
    const obj: Record<string, string> = {};
    header.forEach((key, c) => {
      const value = (cells[c] ?? '').trim();
      if (key && value !== '') obj[key] = value;
    });
    records.push(obj);
  }
  return { records, error: null };
}
