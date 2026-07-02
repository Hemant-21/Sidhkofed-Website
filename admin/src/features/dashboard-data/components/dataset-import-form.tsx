'use client';

/**
 * Reusable dataset import widget (Excel Import — codex §16 / API spec §6). Imports tabular summary
 * data into one report's metrics, for a given report + financial year + reporting period.
 *
 * Two faithful backend paths, one UX:
 *   - FILE  → `POST /admin/dashboard/reports/{id}/datasets/upload` (multipart). The server parses +
 *             validates the sheet; the frontend never parses business rows.
 *   - MANUAL→ `POST /admin/dashboard/reports/{id}/datasets` (JSON rows). The dialog does only the
 *             mechanical CSV-text → rows transform; the backend validates every row.
 *
 * Both support `preview=true` (validate WITHOUT persisting) so the editor sees row counts, errors,
 * duplicates and warnings BEFORE committing. Nothing is calculated or validated in the browser — the
 * backend transactional import is the single source of truth, and its results are surfaced verbatim.
 */

import { useState } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, X } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/feedback/progress';
import { FileUpload } from '@/components/ui/file-upload';
import { useFinancialYearOptions, useReportingPeriodOptions } from '@/components/relationships';
import { formatFileSize } from '@/utils/format';
import { parseCsvGrid, csvToRecords } from '@/utils/csv';
import { useCreateDataset, useUploadDataset } from '../api';
import {
  isDatasetPreview,
  type DatasetResult,
  type DatasetRowInput,
  type DatasetRowError,
} from '../types';

const DATASET_TEMPLATE_COLUMNS = [
  'metric_key',
  'label_en',
  'label_hi',
  'value',
  'value_text',
  'unit',
  'display_order',
];

const ACCEPT =
  '.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type Mode = 'file' | 'manual';

/** Coerce CSV records → typed dataset rows (mechanical only; backend validates). */
function recordsToRows(records: Array<Record<string, string>>): DatasetRowInput[] {
  return records.map((r) => {
    const row: Record<string, unknown> = { ...r };
    if (r.value !== undefined) row.value = Number(r.value);
    if (r.display_order !== undefined) row.display_order = Number(r.display_order);
    return row as unknown as DatasetRowInput;
  });
}

export interface DatasetImportFormProps {
  reportId: string;
  /** Called after a successful (non-preview) import. */
  onImported?: (result: DatasetResult) => void;
}

export function DatasetImportForm({ reportId, onImported }: DatasetImportFormProps) {
  const [mode, setMode] = useState<Mode>('file');
  const [financialYearId, setFinancialYearId] = useState('');
  const [reportingPeriodId, setReportingPeriodId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<DatasetResult | null>(null);
  const [committed, setCommitted] = useState<DatasetResult | null>(null);

  const financialYears = useFinancialYearOptions();
  const reportingPeriods = useReportingPeriodOptions();

  const upload = useUploadDataset(reportId);
  const manual = useCreateDataset(reportId);
  const busy = upload.isPending || manual.isPending;

  const reset = () => {
    setPreview(null);
    setCommitted(null);
    setParseError(null);
    setProgress(0);
  };

  const periodFields = {
    financial_year_id: financialYearId || undefined,
    reporting_period_id: reportingPeriodId || undefined,
  };

  /** Run an import. `doPreview=true` validates only. */
  const run = async (doPreview: boolean) => {
    setParseError(null);
    setCommitted(null);
    if (!doPreview) setPreview(null);
    try {
      let result: DatasetResult;
      if (mode === 'file') {
        if (!file) {
          setParseError('Choose a CSV or XLSX file first.');
          return;
        }
        result = await upload.mutateAsync({
          file,
          fields: { ...periodFields, preview: doPreview },
          onProgress: setProgress,
        });
      } else {
        const { records, error } = csvToRecords(parseCsvGrid(text));
        if (error) {
          setParseError(error);
          return;
        }
        result = await manual.mutateAsync({
          ...periodFields,
          preview: doPreview,
          rows: recordsToRows(records),
        });
      }
      if (isDatasetPreview(result)) {
        setPreview(result);
      } else {
        setCommitted(result);
        setPreview(null);
        onImported?.(result);
      }
    } catch {
      // The mutation surfaces 4xx via the shared error envelope; row-level 422s render below.
      // A non-validation error is toasted by the hook (manual) or rethrown silently here (upload).
    }
  };

  const previewOk = preview && isDatasetPreview(preview) && preview.valid;
  const previewErrors: DatasetRowError[] =
    preview && isDatasetPreview(preview) ? preview.errors : [];
  const uploadError =
    (mode === 'file' ? upload.error : manual.error) as { message?: string } | null;

  return (
    <Card>
      <CardHeader
        title="Import data"
        description="Validate a CSV/XLSX (or pasted rows) before committing. Every row is validated by the server; the import is all-or-nothing."
      />
      <CardContent className="space-y-5">
        {/* Mode toggle */}
        <div className="inline-flex rounded-md border border-border p-0.5" role="tablist" aria-label="Import mode">
          <ModeButton active={mode === 'file'} onClick={() => { setMode('file'); reset(); }}>
            <FileSpreadsheet className="h-4 w-4" /> File upload
          </ModeButton>
          <ModeButton active={mode === 'manual'} onClick={() => { setMode('manual'); reset(); }}>
            <UploadCloud className="h-4 w-4" /> Paste rows
          </ModeButton>
        </div>

        {/* Reporting scope */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="import-fy">Financial year</Label>
            <Select
              id="import-fy"
              value={financialYearId}
              onChange={(e) => setFinancialYearId(e.target.value)}
              options={[{ value: '', label: 'None' }, ...financialYears.options]}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="import-rp">Reporting period</Label>
            <Select
              id="import-rp"
              value={reportingPeriodId}
              onChange={(e) => setReportingPeriodId(e.target.value)}
              options={[{ value: '', label: 'None' }, ...reportingPeriods.options]}
            />
          </div>
        </div>

        {/* Source input */}
        <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Template columns (header row):</p>
          <code className="mt-1 block break-words">{DATASET_TEMPLATE_COLUMNS.join(', ')}</code>
          <p className="mt-1">
            Required per row: <code>metric_key</code>, <code>label_en</code>, and exactly one of{' '}
            <code>value</code> / <code>value_text</code>.
          </p>
        </div>

        {mode === 'file' ? (
          file ? (
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <span className="flex items-center gap-2 truncate">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFile(null); reset(); }}
                aria-label="Remove file"
                disabled={busy}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <FileUpload
              accept={ACCEPT}
              maxSizeMb={10}
              label="Upload a CSV or XLSX file"
              hint="CSV or XLSX · The server validates rows and column headers"
              onFiles={(files) => {
                setFile(files[0] ?? null);
                reset();
              }}
            />
          )
        ) : (
          <div className="space-y-1">
            <Label htmlFor="import-csv">CSV rows</Label>
            <Textarea
              id="import-csv"
              rows={8}
              value={text}
              onChange={(e) => { setText(e.target.value); reset(); }}
              placeholder={`${DATASET_TEMPLATE_COLUMNS.join(',')}\nsidhkofed_primary,SIDHKOFED Primary Members,,1240,,members,1`}
              className="font-mono text-xs"
            />
          </div>
        )}

        {busy && progress > 0 && progress < 100 ? <Progress value={progress} /> : null}
        {parseError ? <Alert tone="danger">{parseError}</Alert> : null}
        {uploadError && previewErrors.length === 0 && !committed ? (
          <Alert tone="danger">{uploadError.message ?? 'Import failed. Check the file and try again.'}</Alert>
        ) : null}

        {/* Preview result */}
        {preview && isDatasetPreview(preview) ? (
          <div className="space-y-3">
            <Alert tone={previewOk ? 'success' : 'warning'}>
              Preview: {preview.row_count} row(s) ·{' '}
              {previewOk ? 'all rows valid — ready to import' : `${previewErrors.length} row(s) need fixing`}
            </Alert>
            {previewErrors.length > 0 ? <RowErrorTable errors={previewErrors} /> : null}
          </div>
        ) : null}

        {/* Commit result */}
        {committed && !isDatasetPreview(committed) ? (
          <Alert tone="success" title="Imported">
            <span className="flex flex-wrap items-center gap-2">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {committed.metrics_created} metric(s) created, {committed.metrics_updated} updated ·
              dataset <Badge tone="success">{committed.dataset.status}</Badge> with{' '}
              {committed.dataset.row_count} row(s).
            </span>
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => void run(true)}
            isLoading={busy}
            disabled={mode === 'file' ? !file : text.trim() === ''}
          >
            Validate (preview)
          </Button>
          <Button
            onClick={() => void run(false)}
            isLoading={busy}
            disabled={
              (mode === 'file' ? !file : text.trim() === '') ||
              (preview != null && !previewOk)
            }
          >
            Import
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function RowErrorTable({ errors }: { errors: DatasetRowError[] }) {
  return (
    <div className="max-h-60 overflow-auto rounded-md border border-border">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Row</th>
            <th className="px-3 py-2">Errors</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {errors.map((e) => (
            <tr key={e.row}>
              <td className="px-3 py-2 align-top font-medium">{e.row + 1}</td>
              <td className="px-3 py-2">
                <ul className="space-y-0.5">
                  {Object.entries(e.fields).map(([field, msgs]) => (
                    <li key={field}>
                      <span className="font-medium text-foreground">{field}:</span> {msgs.join(' ')}
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
