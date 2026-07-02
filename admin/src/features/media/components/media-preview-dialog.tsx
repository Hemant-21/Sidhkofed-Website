'use client';

/**
 * Media preview dialog. Safe preview by type (image / video / PDF, else metadata only), inline
 * descriptive-metadata editing, download, file replacement, relationship-usage list, and
 * archive/restore. All actions hit the backend media endpoints; usage references explain why a
 * linked asset cannot be hard-deleted (codex §5.1). Permission-aware via role gating.
 */

import { useEffect, useState } from 'react';
import { Download, RefreshCw, Archive, RotateCcw, Link2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Can } from '@/components/auth';
import { useArchive, useRestore } from '@/hooks/crud';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { formatFileSize, humanize } from '@/utils/format';
import { formatDate } from '@/utils/date';
import { MEDIA_RESOURCE, MEDIA_ROLES, useMediaUsages, useReplaceMediaFile, useUpdateMediaMeta } from '../api';
import { isImage, type MediaAsset } from '../types';

export interface MediaPreviewDialogProps {
  asset: MediaAsset | null;
  open: boolean;
  onClose: () => void;
}

export function MediaPreviewDialog({ asset, open, onClose }: MediaPreviewDialogProps) {
  const confirm = useConfirmDialog();
  const updateMeta = useUpdateMediaMeta();
  const replace = useReplaceMediaFile();
  const archive = useArchive<MediaAsset>(MEDIA_RESOURCE);
  const restore = useRestore<MediaAsset>(MEDIA_RESOURCE);
  const usages = useMediaUsages(asset?.id, open);

  const [title, setTitle] = useState('');
  const [altText, setAltText] = useState('');
  const [caption, setCaption] = useState('');

  useEffect(() => {
    if (asset) {
      setTitle(asset.title ?? '');
      setAltText(asset.alt_text ?? '');
      setCaption(asset.caption ?? '');
    }
  }, [asset]);

  if (!asset) return null;
  const archived = Boolean(asset.archived_at);

  const onReplace = async (file: File | undefined) => {
    if (!file) return;
    await replace.mutateAsync({ id: asset.id, file });
  };

  return (
    <Dialog open={open} onClose={onClose} title={asset.title ?? asset.file_name} size="xl" dismissible={!replace.isPending}>
      <div className="grid gap-5 md:grid-cols-2">
        {/* Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
            <MediaPreview asset={asset} />
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <Meta label="Type">{asset.mime_type}</Meta>
            <Meta label="Size">{formatFileSize(asset.file_size)}</Meta>
            {asset.width && asset.height ? <Meta label="Dimensions">{asset.width}×{asset.height}</Meta> : null}
            <Meta label="Added">{formatDate(asset.created_at)}</Meta>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={asset.url} download={asset.file_name} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" aria-hidden="true" /> Download
              </a>
            </Button>
            <Can role={MEDIA_ROLES}>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> Replace
                <input type="file" className="sr-only" disabled={replace.isPending} onChange={(e) => void onReplace(e.target.files?.[0])} />
              </label>
            </Can>
          </div>
          {replace.isPending ? <p className="text-xs text-muted-foreground">Replacing file…</p> : null}
        </div>

        {/* Metadata + usages + lifecycle */}
        <div className="space-y-4">
          {archived ? <Badge tone="danger">Archived</Badge> : null}
          <Can
            role={MEDIA_ROLES}
            fallback={
              <dl className="space-y-2 text-sm">
                <Meta label="Title">{asset.title ?? '—'}</Meta>
                <Meta label="Alt text">{asset.alt_text ?? '—'}</Meta>
                <Meta label="Caption">{asset.caption ?? '—'}</Meta>
              </dl>
            }
          >
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="media-title">Title</Label>
                <Input id="media-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="media-alt">Alt text</Label>
                <Input id="media-alt" value={altText} onChange={(e) => setAltText(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="media-caption">Caption</Label>
                <Textarea id="media-caption" rows={2} value={caption} onChange={(e) => setCaption(e.target.value)} />
              </div>
              <Button
                size="sm"
                isLoading={updateMeta.isPending}
                onClick={() => updateMeta.mutate({ id: asset.id, meta: { title, alt_text: altText, caption } })}
              >
                Save metadata
              </Button>
            </div>
          </Can>

          <div>
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> Used in
            </p>
            {usages.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading usages…</p>
            ) : (usages.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Not linked anywhere — can be archived safely.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {usages.data?.map((u, i) => (
                  <li key={`${u.entity_type}-${u.entity_id}-${i}`}>
                    <Badge tone="info">{humanize(u.entity_type)} · {u.field}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Can role={MEDIA_ROLES}>
            <div className="border-t border-border pt-3">
              {archived ? (
                <Button size="sm" variant="outline" isLoading={restore.isPending} onClick={() => restore.mutate(asset.id)}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Restore
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  isLoading={archive.isPending}
                  onClick={async () => {
                    if (await confirm.confirmArchive('this media asset')) archive.mutate(asset.id);
                  }}
                >
                  <Archive className="h-4 w-4" aria-hidden="true" /> Archive
                </Button>
              )}
            </div>
          </Can>
        </div>
      </div>
    </Dialog>
  );
}

function MediaPreview({ asset }: { asset: MediaAsset }) {
  if (isImage(asset)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={asset.url} alt={asset.alt_text ?? asset.title ?? asset.file_name} className="max-h-[22rem] w-full object-contain" />;
  }
  if (asset.mime_type.startsWith('video/')) {
    return <video src={asset.url} controls className="max-h-[22rem] w-full" aria-label={asset.title ?? asset.file_name} />;
  }
  if (asset.mime_type === 'application/pdf') {
    return <iframe src={asset.url} title={asset.title ?? asset.file_name} className="h-[22rem] w-full" />;
  }
  return (
    <div className="flex h-48 w-full flex-col items-center justify-center gap-2 text-muted-foreground">
      <span className="text-sm">No inline preview for {asset.mime_type}</span>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground">{children}</dd>
    </div>
  );
}
