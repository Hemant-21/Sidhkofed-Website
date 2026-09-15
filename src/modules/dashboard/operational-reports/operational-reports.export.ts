/**
 * Builds the three-sheet XLSX workbook (Summary / Data / Definitions) for an Operational Report
 * export. Framework-free: takes an already-computed `ReportResult` (from
 * `operational-reports.service.ts`'s `generateForExport`, which reuses the same `computeReport` call
 * as `/generate`) plus the report's registry definition, and returns the `XlsxSheet[]` shape
 * `src/utils/xlsx-writer.ts` accepts. No Prisma, no Express.
 */
import type { XlsxCellValue, XlsxSheet } from '@/utils/xlsx-writer';
import type { ReportDefinition, ReportResult } from './operational-reports.types';

function buildSummarySheet(def: ReportDefinition, result: ReportResult): XlsxSheet {
  const rows: XlsxCellValue[][] = [
    ['Report', def.titleEn],
    ['Report (Hindi)', def.titleHi ?? ''],
    ['Period mode', result.resolvedPeriod.mode],
    ['Period start', result.resolvedPeriod.start],
    ['Period end', result.resolvedPeriod.end],
    ['Financial year', result.resolvedPeriod.financialYearLabel ?? ''],
    ['Basis', result.resolvedPeriod.basisDescription],
    ['Generated at', result.calculatedAt],
    [],
    [
      'Measure key',
      'Label (EN)',
      'Label (HI)',
      'Value',
      'Unit',
      'Note (EN)',
      'Completeness: known',
      'Completeness: missing',
      'Completeness: undated',
    ],
  ];
  for (const m of result.summary) {
    rows.push([
      m.key,
      m.labelEn,
      m.labelHi ?? '',
      m.value === null ? '' : m.value,
      m.unit ?? '',
      m.noteEn,
      m.completeness?.known ?? '',
      m.completeness?.missing ?? '',
      m.completeness?.undated ?? '',
    ]);
  }
  return { name: 'Summary', rows };
}

function cellFor(value: unknown): XlsxCellValue {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value;
  if (typeof value === 'number' || typeof value === 'boolean') return typeof value === 'boolean' ? String(value) : value;
  if (typeof value === 'string') {
    // ISO date-only strings (e.g. `effectiveDate` echoed from a `@db.Date` column) render as typed
    // dates rather than plain text.
    if (/^\d{4}-\d{2}-\d{2}(T00:00:00(\.000)?Z)?$/.test(value)) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return value;
  }
  return String(value);
}

function buildDataSheet(result: ReportResult): XlsxSheet {
  const items = result.rows.items;
  if (items.length === 0) {
    return { name: 'Data', rows: [['(no rows for this period/filters)']] };
  }
  const columns = Array.from(
    items.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );
  const rows: XlsxCellValue[][] = [columns];
  for (const item of items) {
    rows.push(columns.map((c) => cellFor((item as Record<string, unknown>)[c])));
  }
  return { name: 'Data', rows };
}

function buildDefinitionsSheet(def: ReportDefinition): XlsxSheet {
  const rows: XlsxCellValue[][] = [
    ['Measure key', 'Label (EN)', 'Label (HI)', 'Unit', 'Note (EN)', 'Note (HI)', 'Calculation version'],
  ];
  for (const m of def.measures) {
    rows.push([m.key, m.labelEn, m.labelHi ?? '', m.unit ?? '', m.noteEn, m.noteHi ?? '', m.calculationVersion]);
  }
  return { name: 'Definitions', rows };
}

export function buildReportExportSheets(def: ReportDefinition, result: ReportResult): XlsxSheet[] {
  return [buildSummarySheet(def, result), buildDataSheet(result), buildDefinitionsSheet(def)];
}
