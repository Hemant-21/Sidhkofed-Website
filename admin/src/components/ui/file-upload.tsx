'use client';

/**
 * File-upload WRAPPER (UI only). Provides an accessible drag-and-drop + click
 * dropzone and surfaces selected files; the actual upload to `/admin/media` is the
 * caller's concern via `http.uploadFile`. Reusable by media/document modules later.
 */

import { useId, useRef, useState, type DragEvent } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatFileSize } from '@/utils/format';

export interface FileUploadProps {
  /** Called with the selected file list (already filtered to `accept`). */
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  /** Max size per file (MB) — soft client check; server is authoritative. */
  maxSizeMb?: number;
  disabled?: boolean;
  label?: string;
  hint?: string;
  className?: string;
}

export function FileUpload({
  onFiles,
  accept,
  multiple = false,
  maxSizeMb,
  disabled,
  label = 'Click to upload or drag and drop',
  hint,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);
  const id = useId();

  const handle = (list: FileList | null) => {
    if (!list) return;
    const files = Array.from(list);
    if (maxSizeMb) {
      const tooBig = files.find((f) => f.size > maxSizeMb * 1024 * 1024);
      if (tooBig) {
        setRejected(`"${tooBig.name}" exceeds ${maxSizeMb} MB.`);
        return;
      }
    }
    setRejected(null);
    onFiles(files);
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    handle(e.dataTransfer.files);
  };

  return (
    <div className={className}>
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        <UploadCloud className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-medium text-foreground">{label}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
        {maxSizeMb ? (
          <span className="text-xs text-muted-foreground">Max {formatFileSize(maxSizeMb * 1024 * 1024)}</span>
        ) : null}
        <input
          ref={inputRef}
          id={id}
          type="file"
          className="sr-only"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => handle(e.target.files)}
        />
      </label>
      {rejected ? (
        <p className="mt-2 text-xs text-danger" role="alert">
          {rejected}
        </p>
      ) : null}
    </div>
  );
}
