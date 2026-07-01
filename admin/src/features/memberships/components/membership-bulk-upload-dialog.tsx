'use client';

/**
 * Membership bulk-upload dialog (codex §4.15 "Bulk Excel upload may be supported" / API spec §6).
 *
 * The backend endpoint (`POST /admin/memberships/bulk-upload`) accepts a JSON `{ rows: [...] }`
 * payload and performs ALL validation server-side (required fields, reference existence, master
 * activation, duplicate detection) in ONE transaction, returning row-level errors. This dialog only
 * does the mechanical CSV-text → row-object transform; it runs NO business validation itself — the
 * backend remains the single source of truth, and its row errors are surfaced verbatim so the editor
 * can correct invalid rows and retry.
 *
 * Accepts a CSV file or pasted CSV. The header row names the columns (the membership row fields);
 * unknown columns / values are passed through to the backend, which rejects them.
 */

import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileUpload } from '@/components/ui/file-upload';
import { Alert } from '@/components/ui/alert';
import { parseCsvGrid, csvToRecords } from '@/utils/csv';
import { useMembershipBulkUpload } from '../api';
import type { MembershipBulkRow } from '../types';

const TEMPLATE_COLUMNS = [
  'institution_id',
  'membership_level',
  'membership_type',
  'membership_number',
  'district_id',
  'district_union_id',
  'reporting_period_id',
  'status',
  'join_date',
  'notes_en',
  'notes_hi',
];

/** Turn pasted CSV text into the membership row objects the backend expects (no validation). */
function textToRows(text: string): { rows: MembershipBulkRow[]; error: string | null } {
  const { records, error } = csvToRecords(parseCsvGrid(text));
  return { rows: records as unknown as MembershipBulkRow[], error };
}

export interface MembershipBulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
}

export function MembershipBulkUploadDialog({ open, onClose }: MembershipBulkUploadDialogProps) {
  const [text, setText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const bulk = useMembershipBulkUpload();
  const result = bulk.data;

  const reset = () => {
    setText('');
    setParseError(null);
    bulk.reset();
  };

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = async () => {
    setParseError(null);
    const { rows, error } = textToRows(text);
    if (error) {
      setParseError(error);
      return;
    }
    await bulk.mutateAsync(rows);
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      size="xl"
      title="Bulk import memberships"
      description="Paste CSV rows or upload a CSV file. Every row is validated by the server in one transaction; invalid rows are skipped and reported below."
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={close} disabled={bulk.isPending}>
            Close
          </Button>
          <Button onClick={() => void onSubmit()} isLoading={bulk.isPending} disabled={text.trim() === ''}>
            Validate & import
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Expected columns (header row):</p>
          <code className="mt-1 block break-words">{TEMPLATE_COLUMNS.join(', ')}</code>
          <p className="mt-2">
            Required: <code>institution_id</code>, <code>membership_level</code>{' '}
            (sidhkofed | district_union), <code>membership_type</code> (primary | nominal).{' '}
            <code>district_union_id</code> is required when the level is district_union.
          </p>
        </div>

        <FileUpload
          accept=".csv,text/csv"
          maxSizeMb={5}
          label="Upload a CSV file"
          hint="CSV format · or paste rows below"
          onFiles={async (files) => {
            const file = files[0];
            if (!file) return;
            setText(await file.text());
            setParseError(null);
          }}
        />

        <div className="space-y-1">
          <label htmlFor="bulk-csv" className="text-sm font-medium text-foreground">
            CSV rows
          </label>
          <Textarea
            id="bulk-csv"
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`${TEMPLATE_COLUMNS.join(',')}\n<uuid>,sidhkofed,primary,SKF/2026/01,,,,active,2026-04-01,,`}
            className="font-mono text-xs"
          />
        </div>

        {parseError ? <Alert tone="danger">{parseError}</Alert> : null}

        {result ? (
          <div className="space-y-3">
            <Alert tone={result.errors.length === 0 ? 'success' : 'warning'}>
              Imported {result.created_count} membership(s); skipped {result.skipped_count}.
            </Alert>
            {result.errors.length > 0 ? (
              <div className="max-h-60 overflow-auto rounded-md border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Errors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.errors.map((e) => (
                      <tr key={e.row}>
                        <td className="px-3 py-2 align-top font-medium">{e.row + 1}</td>
                        <td className="px-3 py-2">
                          <ul className="space-y-0.5">
                            {Object.entries(e.fields).map(([field, msgs]) => (
                              <li key={field}>
                                <span className="font-medium text-foreground">{field}:</span>{' '}
                                {msgs.join(' ')}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
