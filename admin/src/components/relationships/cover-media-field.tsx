'use client';

/**
 * Reusable cover-image field (Phase 15.3 reference pattern). Binds an RHF `*_media_id`
 * field to the shared {@link MediaPickerDialog}: pick an existing image or upload a new one,
 * with a live preview and a clear/replace affordance. Stores only the media UUID; the preview
 * URL is held locally. Any module's "cover image" field is one line of JSX.
 */

import { useState, type ReactNode } from 'react';
import type { FieldValues, Path } from 'react-hook-form';
import { ImageIcon, RefreshCw, X } from 'lucide-react';
import { FormField } from '@/components/form/form-field';
import { Button } from '@/components/ui/button';
import { MediaPickerDialog } from './media-picker-dialog';
import type { MediaItem } from './media-api';

export interface CoverMediaFieldProps<T extends FieldValues> {
  name: Path<T>;
  label?: ReactNode;
  description?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  /** Existing media to preview when editing (the detail's `cover_media`). */
  initialMedia?: { id: string; url: string; alt_text?: string | null } | null;
  className?: string;
}

export function CoverMediaField<T extends FieldValues>({
  name,
  label,
  description,
  required,
  disabled,
  initialMedia,
  className,
}: CoverMediaFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<MediaItem | null>(null);

  return (
    <FormField<T>
      name={name}
      label={label}
      description={description}
      required={required}
      className={className}
      render={({ field, invalid }) => {
        // Preview URL: a freshly picked image wins, else the initial media if its id still matches.
        const previewUrl =
          picked && picked.id === field.value
            ? picked.url
            : initialMedia && initialMedia.id === field.value
              ? initialMedia.url
              : null;
        const alt = picked?.alt_text ?? initialMedia?.alt_text ?? 'Selected cover image';

        const select = (media: MediaItem) => {
          setPicked(media);
          field.onChange(media.id);
        };
        const clear = () => {
          setPicked(null);
          field.onChange(null);
        };

        return (
          <div>
            {field.value && previewUrl ? (
              <div
                className="relative inline-block overflow-hidden rounded-lg border border-border"
                aria-invalid={invalid || undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt={alt} className="h-40 w-auto object-cover" />
                {!disabled ? (
                  <div className="absolute right-2 top-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setOpen(true)}
                      aria-label="Replace image"
                      className="rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={clear}
                      aria-label="Remove image"
                      className="rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </div>
            ) : field.value ? (
              // Has an id but no resolvable preview (e.g. created elsewhere) — show a chip.
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground">
                  <ImageIcon className="h-4 w-4" aria-hidden="true" /> Image selected
                </span>
                {!disabled ? (
                  <>
                    <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
                      Change
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={clear}>
                      Remove
                    </Button>
                  </>
                ) : null}
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={() => setOpen(true)}
                leftIcon={<ImageIcon className="h-4 w-4" />}
                aria-invalid={invalid || undefined}
              >
                Select cover image
              </Button>
            )}

            <MediaPickerDialog open={open} onClose={() => setOpen(false)} onSelect={select} />
          </div>
        );
      }}
    />
  );
}
