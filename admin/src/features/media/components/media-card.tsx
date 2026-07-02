'use client';

/**
 * Media grid cell. Shows a lazy-loaded thumbnail (image) or a typed file icon, plus filename,
 * dimensions, size, type, and created date. Accessible selection checkbox + a preview action.
 * Memoized so re-rendering the grid (selection changes) doesn't re-render every cell.
 */

import { memo } from 'react';
import { FileText, Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatFileSize } from '@/utils/format';
import { formatDate } from '@/utils/date';
import { isImage, type MediaAsset } from '../types';

export interface MediaCardProps {
  asset: MediaAsset;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onOpen: (asset: MediaAsset) => void;
}

function MediaCardImpl({ asset, selectable, selected, onToggleSelect, onOpen }: MediaCardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg border bg-surface transition-colors',
        selected ? 'border-primary ring-2 ring-primary/40' : 'border-border hover:border-primary/50',
      )}
    >
      {selectable ? (
        <label className="absolute left-2 top-2 z-10 flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={selected ?? false}
            onChange={() => onToggleSelect?.(asset.id)}
            aria-label={`Select ${asset.title ?? asset.file_name}`}
          />
          <span
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded border border-border bg-white/90 text-transparent',
              'peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
            )}
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </label>
      ) : null}

      <button
        type="button"
        onClick={() => onOpen(asset)}
        className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title={asset.title ?? asset.file_name}
      >
        <div className="flex aspect-video items-center justify-center bg-muted">
          {isImage(asset) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asset.url}
              alt={asset.alt_text ?? asset.title ?? asset.file_name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <FileText className="h-10 w-10" aria-hidden="true" />
              <span className="text-xs uppercase">{asset.extension ?? asset.mime_type}</span>
            </div>
          )}
        </div>
        <div className="space-y-0.5 px-2.5 py-2">
          <p className="truncate text-sm font-medium text-foreground">{asset.title ?? asset.file_name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ''}
            {formatFileSize(asset.file_size)}
          </p>
          <p className="text-xs text-muted-foreground">{formatDate(asset.created_at)}</p>
        </div>
      </button>
    </div>
  );
}

export const MediaCard = memo(MediaCardImpl);
