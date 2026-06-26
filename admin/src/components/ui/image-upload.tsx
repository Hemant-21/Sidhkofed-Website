'use client';

/**
 * Image-upload WRAPPER — FileUpload + a local preview. Upload wiring is the
 * caller's concern (media endpoints). Object URLs are revoked on replace to avoid
 * leaks. Restricts to images by default.
 */

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { FileUpload } from './file-upload';

export interface ImageUploadProps {
  onSelect: (file: File | null) => void;
  /** Existing image URL (e.g. current cover media). */
  initialUrl?: string | null;
  maxSizeMb?: number;
  disabled?: boolean;
  className?: string;
}

export function ImageUpload({ onSelect, initialUrl, maxSizeMb = 5, disabled, className }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const pick = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setPreview(url);
    onSelect(file);
  };

  const clear = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(null);
    setPreview(null);
    onSelect(null);
  };

  if (preview) {
    return (
      <div className={cn('relative inline-block overflow-hidden rounded-lg border border-border', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="Selected preview" className="h-40 w-auto object-cover" />
        {!disabled ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Remove image"
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <FileUpload
      onFiles={pick}
      accept="image/*"
      maxSizeMb={maxSizeMb}
      disabled={disabled}
      label="Upload an image"
      hint="PNG, JPG, or WebP"
      className={className}
    />
  );
}
