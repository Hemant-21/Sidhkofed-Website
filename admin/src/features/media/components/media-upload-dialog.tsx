'use client';

/**
 * Media upload dialog. Images only (JPEG / PNG / WebP / GIF / SVG). Per-file validation is
 * server-authoritative; the accept attribute is a client-side hint only. Progress, retry of
 * failed items, and cancel of the pending queue are all supported. Files upload sequentially
 * through the shared single-upload pipeline (POST /admin/media). Image previews are shown
 * before upload. Documents are managed in the Document Centre, not here.
 */

import { useRef, useState } from 'react';
import { CheckCircle2, RotateCw, XCircle, ImageOff } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/ui/file-upload';
import { Progress } from '@/components/feedback/progress';
import { errorMessage } from '@/lib/api/server-errors';
import { useToast } from '@/hooks/use-toast';
import { formatFileSize } from '@/utils/format';
import { useUploadMedia } from '../api';

type ItemStatus = 'queued' | 'uploading' | 'done' | 'error';
interface UploadItem {
  id: string;
  file: File;
  previewUrl: string | null;
  status: ItemStatus;
  progress: number;
  error?: string;
}

export interface MediaUploadDialogProps {
  open: boolean;
  onClose: () => void;
}

let itemSeq = 0;

export function MediaUploadDialog({ open, onClose }: MediaUploadDialogProps) {
  const toast = useToast();
  const upload = useUploadMedia();
  const [items, setItems] = useState<UploadItem[]>([]);
  const cancelRef = useRef(false);
  const [running, setRunning] = useState(false);

  const update = (id: string, patch: Partial<UploadItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const addFiles = (files: File[]) => {
    const next = files.map<UploadItem>((file) => ({
      id: `u${itemSeq++}`,
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      status: 'queued',
      progress: 0,
    }));
    setItems((prev) => [...prev, ...next]);
  };

  const uploadOne = async (item: UploadItem) => {
    update(item.id, { status: 'uploading', progress: 0, error: undefined });
    try {
      await upload.mutateAsync({ file: item.file, meta: { alt_text: item.file.name }, onProgress: (pct) => update(item.id, { progress: pct }) });
      update(item.id, { status: 'done', progress: 100 });
      return true;
    } catch (err) {
      update(item.id, { status: 'error', error: errorMessage(err) });
      return false;
    }
  };

  const start = async () => {
    cancelRef.current = false;
    setRunning(true);
    let ok = 0;
    let fail = 0;
    // Re-read current queued items each pass (state may have changed via retry).
    for (const item of items) {
      if (cancelRef.current) break;
      if (item.status !== 'queued') continue;
      const success = await uploadOne(item);
      if (success) ok++;
      else fail++;
    }
    setRunning(false);
    if (ok > 0) toast.success(`Uploaded ${ok} file(s).`);
    if (fail > 0) toast.error(`${fail} file(s) failed. Retry them individually.`);
  };

  const retry = (item: UploadItem) => void uploadOne(item);

  const cleanup = () => {
    items.forEach((it) => it.previewUrl && URL.revokeObjectURL(it.previewUrl));
    setItems([]);
  };

  const handleClose = () => {
    if (running) return;
    cleanup();
    onClose();
  };

  const queuedCount = items.filter((i) => i.status === 'queued').length;

  return (
    <Dialog open={open} onClose={handleClose} title="Upload media" size="xl" dismissible={!running}>
      <div className="space-y-4">
        <FileUpload onFiles={addFiles} multiple accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" maxSizeMb={10} label="Click or drag images to upload" hint="JPEG, PNG, WebP, GIF or SVG · Documents go to the Document Centre" />

        {items.length > 0 ? (
          <ul className="max-h-[24rem] space-y-2 overflow-y-auto">
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-3 rounded-md border border-border p-2">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                  {it.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.previewUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageOff className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{it.file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(it.file.size)}</p>
                  {it.status === 'uploading' ? <Progress value={it.progress} className="mt-1" label="Uploading" /> : null}
                  {it.status === 'error' ? <p className="mt-0.5 text-xs text-danger">{it.error}</p> : null}
                </div>
                <div className="shrink-0">
                  {it.status === 'done' ? (
                    <CheckCircle2 className="h-5 w-5 text-success" aria-label="Uploaded" />
                  ) : it.status === 'error' ? (
                    <Button size="sm" variant="ghost" onClick={() => retry(it)} aria-label="Retry upload">
                      <RotateCw className="h-4 w-4" aria-hidden="true" /> Retry
                    </Button>
                  ) : it.status === 'uploading' ? (
                    <span className="text-xs text-muted-foreground">{it.progress}%</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setItems((prev) => prev.filter((p) => p.id !== it.id))}
                      aria-label="Remove from queue"
                      className="text-muted-foreground hover:text-danger"
                    >
                      <XCircle className="h-5 w-5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          {running ? (
            <Button variant="outline" onClick={() => (cancelRef.current = true)}>
              Cancel remaining
            </Button>
          ) : (
            <Button variant="ghost" onClick={handleClose}>
              Close
            </Button>
          )}
          <Button onClick={start} isLoading={running} disabled={queuedCount === 0}>
            Upload {queuedCount > 0 ? `(${queuedCount})` : ''}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
