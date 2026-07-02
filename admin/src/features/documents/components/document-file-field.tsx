'use client';

/**
 * Document attachment field. Binds an RHF `file_asset_id` to the shared media pipeline: it uploads
 * the chosen file to the central media library (`POST /admin/media` via the shared `uploadMedia`
 * helper) and stores the returned asset id — NO separate upload pipeline. Documents are uploaded
 * once and linked by reference (codex §4.5). Shows progress, the resolved file name, and a replace
 * affordance; the file bytes are validated server-side (authoritative).
 */

import { useState } from 'react';
import type { FieldValues, Path } from 'react-hook-form';
import { FileText, RefreshCw } from 'lucide-react';
import { FormField } from '@/components/form/form-field';
import { FileUpload } from '@/components/ui/file-upload';
import { Progress } from '@/components/feedback/progress';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/api/server-errors';
import { uploadMedia } from '@/components/relationships';

export interface DocumentFileFieldProps<T extends FieldValues> {
  name: Path<T>;
  label?: string;
  required?: boolean;
  /** The already-linked file (edit route) so its name shows without a refetch. */
  initialFile?: { id: string; file_name: string } | null;
}

const DOC_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/pdf';

export function DocumentFileField<T extends FieldValues>({ name, label = 'Attachment', required, initialFile }: DocumentFileFieldProps<T>) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedName, setUploadedName] = useState<string | null>(null);

  return (
    <FormField<T>
      name={name}
      label={label}
      required={required}
      render={({ field, invalid }) => {
        const currentName =
          uploadedName ?? (initialFile && initialFile.id === field.value ? initialFile.file_name : null);

        const upload = async (files: File[]) => {
          const file = files[0];
          if (!file) return;
          setUploading(true);
          setProgress(0);
          try {
            const media = await uploadMedia(file, { title: file.name }, (pct) => setProgress(pct));
            field.onChange(media.id);
            setUploadedName(media.file_name);
            toast.success('File uploaded.');
          } catch (err) {
            toast.error(errorMessage(err));
          } finally {
            setUploading(false);
          }
        };

        if (field.value && currentName) {
          return (
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2.5" aria-invalid={invalid || undefined}>
              <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{currentName}</span>
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-primary hover:underline">
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> Replace
                <input
                  type="file"
                  className="sr-only"
                  accept={DOC_ACCEPT}
                  disabled={uploading}
                  onChange={(e) => void upload(Array.from(e.target.files ?? []))}
                />
              </label>
            </div>
          );
        }

        return (
          <div className="space-y-2">
            <FileUpload
              onFiles={(files) => void upload(files)}
              accept={DOC_ACCEPT}
              maxSizeMb={20}
              disabled={uploading}
              label="Upload a document"
              hint="PDF, Word, Excel, PowerPoint or CSV · Stored once and linked by reference"
            />
            {uploading ? (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
                <Progress value={progress} label="Uploading document" />
              </div>
            ) : null}
          </div>
        );
      }}
    />
  );
}
