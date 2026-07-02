'use client';

/**
 * Reusable Media Picker (Phase 15.3 reference pattern). Two accessible tabs — browse the
 * existing media library or upload a new image — over the shared media endpoints. Any content
 * module that needs a cover/image composes this; there is no per-module upload UI.
 *
 * Selection returns a full {@link MediaItem} so the caller can both store the id and render a
 * preview without a second fetch. Safe previews only (images), with descriptive alt text.
 */

import { useState } from 'react';
import { Check, ImageOff } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Dialog } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SearchInput } from '@/components/ui/search-input';
import { ImageUpload } from '@/components/ui/image-upload';
import { Skeleton } from '@/components/feedback/skeleton';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/api/server-errors';
import { useMediaList, uploadMedia, type MediaItem } from './media-api';

export interface MediaPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (media: MediaItem) => void;
  title?: string;
}

export function MediaPickerDialog({ open, onClose, onSelect, title = 'Select image' }: MediaPickerDialogProps) {
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();
  // Image picker: cover / icon / thumbnail / gallery image selections must never show non-image
  // assets (PDF/DOC). The list is filtered to `image/*` so no broken thumbnails appear either.
  const list = useMediaList({ search: debounced || undefined, enabled: open, imageOnly: true });

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const media = await uploadMedia(file, { alt_text: file.name });
      toast.success('Image uploaded.');
      onSelect(media);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const pick = (media: MediaItem) => {
    onSelect(media);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={title} size="xl" dismissible={!uploading}>
      <Tabs defaultValue="library">
        <TabsList>
          <TabsTrigger value="library">Media library</TabsTrigger>
          <TabsTrigger value="upload">Upload new</TabsTrigger>
        </TabsList>

        <TabsContent value="library">
          <div className="space-y-3">
            <SearchInput
              value={search}
              onValueChange={setSearch}
              placeholder="Search images by name or title…"
            />
            {list.isError ? (
              <ErrorState error={list.error} onRetry={() => void list.refetch()} />
            ) : list.isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-video w-full rounded-md" />
                ))}
              </div>
            ) : (list.data?.items.length ?? 0) === 0 ? (
              <EmptyState
                icon={ImageOff}
                title="No images found"
                description="Upload a new image from the other tab."
              />
            ) : (
              <ul className="grid max-h-[26rem] grid-cols-2 gap-3 overflow-y-auto p-0.5 sm:grid-cols-4">
                {list.data?.items.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => pick(m)}
                      className={cn(
                        'group relative block w-full overflow-hidden rounded-md border border-border',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      )}
                      title={m.title ?? m.file_name}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.url}
                        alt={m.alt_text ?? m.title ?? m.file_name}
                        className="aspect-video w-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                      <span className="absolute inset-0 hidden items-center justify-center bg-primary/40 group-hover:flex">
                        <Check className="h-6 w-6 text-white" aria-hidden="true" />
                      </span>
                      <span className="block truncate px-1.5 py-1 text-left text-xs text-muted-foreground">
                        {m.title ?? m.file_name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="upload">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload reuses the central media library — the file becomes available to every module.
            </p>
            <ImageUpload onSelect={handleUpload} disabled={uploading} />
            {uploading ? <p className="text-sm text-muted-foreground">Uploading…</p> : null}
          </div>
        </TabsContent>
      </Tabs>
    </Dialog>
  );
}
