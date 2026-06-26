'use client';

/**
 * Gallery image management. Full CRUD over the gallery's images using ONLY the backend image
 * endpoints (gallery.routes.ts):
 *   - add     → MediaPickerDialog (image-only) → POST /:id/images { media_id }
 *   - reorder → move up/down → POST /:id/images/reorder { order: [...] }
 *   - update  → caption_en/hi + display_order → PATCH /:id/images/:imageId
 *   - alt text → PATCH /admin/media/:mediaId (the alt text lives on the reusable media asset)
 *   - remove  → DELETE /:id/images/:imageId (the media asset itself is NOT deleted)
 *
 * Permission-aware via <Can> against the shared `content.*` keys; the backend enforces RBAC.
 */

import { useState } from 'react';
import { Plus, ArrowUp, ArrowDown, Pencil, Trash2, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/feedback/empty-state';
import { Can } from '@/components/auth';
import { MediaPickerDialog, type MediaItem } from '@/components/relationships';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useUpdateMediaMeta } from '@/features/media/api';
import { GALLERY_PERMS } from '../api';
import type { GalleryDetail, GalleryImage } from '../types';
import {
  useAddGalleryImage,
  useRemoveGalleryImage,
  useReorderGalleryImages,
  useUpdateGalleryImage,
} from '../api';

export function GalleryImageManager({ gallery }: { gallery: GalleryDetail }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryImage | null>(null);
  const confirm = useConfirmDialog();

  const addImage = useAddGalleryImage();
  const removeImage = useRemoveGalleryImage();
  const reorder = useReorderGalleryImages();

  const images = [...gallery.images].sort((a, b) => a.display_order - b.display_order);
  const busy = addImage.isPending || removeImage.isPending || reorder.isPending;

  const onAdd = (media: MediaItem) => {
    addImage.mutate({ galleryId: gallery.id, vars: { media_id: media.id } });
  };

  const move = (image: GalleryImage, direction: -1 | 1) => {
    const index = images.findIndex((i) => i.id === image.id);
    const target = images[index + direction];
    if (!target) return;
    reorder.mutate({
      galleryId: gallery.id,
      vars: {
        order: [
          { id: image.id, display_order: target.display_order },
          { id: target.id, display_order: image.display_order },
        ],
      },
    });
  };

  const onRemove = async (image: GalleryImage) => {
    const ok = await confirm.confirmDelete(
      'this image from the gallery',
      'The image is removed from this gallery. The underlying media asset stays in the Media Library.',
    );
    if (ok) removeImage.mutate({ galleryId: gallery.id, vars: { imageId: image.id } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Images <span className="text-muted-foreground">({images.length})</span>
        </h3>
        <Can anyOf={[GALLERY_PERMS.create, GALLERY_PERMS.update]}>
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            isLoading={addImage.isPending}
            onClick={() => setPickerOpen(true)}
          >
            Add image
          </Button>
        </Can>
      </div>

      {images.length === 0 ? (
        <EmptyState
          icon={ImageOff}
          title="No images yet"
          description="Add images from the Media Library to build this gallery."
          action={
            <Can anyOf={[GALLERY_PERMS.create, GALLERY_PERMS.update]}>
              <Button size="sm" onClick={() => setPickerOpen(true)}>
                Add image
              </Button>
            </Can>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <li key={image.id} className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="aspect-video w-full bg-muted">
                {image.media.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image.media.url}
                    alt={image.media.alt_text ?? image.caption_en ?? ''}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <ImageOff className="h-6 w-6" aria-hidden="true" />
                  </span>
                )}
              </div>
              <div className="space-y-2 p-2">
                <p className="truncate text-xs text-muted-foreground" title={image.caption_en ?? ''}>
                  {image.caption_en || <span className="italic">No caption</span>}
                </p>
                <Can permission={GALLERY_PERMS.update}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Move up"
                        disabled={index === 0 || busy}
                        onClick={() => move(image, -1)}
                      >
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Move down"
                        disabled={index === images.length - 1 || busy}
                        onClick={() => move(image, 1)}
                      >
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit image"
                        disabled={busy}
                        onClick={() => setEditing(image)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove image"
                        disabled={busy}
                        onClick={() => void onRemove(image)}
                      >
                        <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </Can>
              </div>
            </li>
          ))}
        </ul>
      )}

      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onAdd}
        title="Add image to gallery"
      />

      {editing ? (
        <EditImageDialog
          galleryId={gallery.id}
          image={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

/** Edit one image: caption (bilingual) + display order via the gallery endpoint, alt text via media. */
function EditImageDialog({
  galleryId,
  image,
  onClose,
}: {
  galleryId: string;
  image: GalleryImage;
  onClose: () => void;
}) {
  const [captionEn, setCaptionEn] = useState(image.caption_en ?? '');
  const [captionHi, setCaptionHi] = useState(image.caption_hi ?? '');
  const [altText, setAltText] = useState(image.media.alt_text ?? '');
  const [order, setOrder] = useState(String(image.display_order));

  const update = useUpdateGalleryImage();
  const updateMeta = useUpdateMediaMeta();
  const saving = update.isPending || updateMeta.isPending;

  const onSave = async () => {
    // Alt text lives on the reusable media asset — persist it via the media endpoint FIRST so the
    // gallery-image update below returns a gallery DTO that already reflects the new alt text.
    if (altText.trim() !== (image.media.alt_text ?? '')) {
      await updateMeta.mutateAsync({ id: image.media.id, meta: { alt_text: altText.trim() } });
    }
    await update.mutateAsync({
      galleryId,
      vars: {
        imageId: image.id,
        body: {
          caption_en: captionEn.trim() === '' ? null : captionEn.trim(),
          caption_hi: captionHi.trim() === '' ? null : captionHi.trim(),
          ...(order.trim() !== '' ? { display_order: Number(order) } : {}),
        },
      },
    });
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title="Edit image" size="md" dismissible={!saving}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="img-caption-en">Caption (English)</Label>
          <Textarea
            id="img-caption-en"
            rows={2}
            value={captionEn}
            onChange={(e) => setCaptionEn(e.target.value)}
            maxLength={500}
          />
        </div>
        <div>
          <Label htmlFor="img-caption-hi">कैप्शन (Hindi)</Label>
          <Textarea
            id="img-caption-hi"
            rows={2}
            value={captionHi}
            onChange={(e) => setCaptionHi(e.target.value)}
            maxLength={500}
          />
        </div>
        <div>
          <Label htmlFor="img-alt">Alt text (media asset)</Label>
          <Input
            id="img-alt"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Describe the image for screen readers"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Alt text is stored on the shared media asset and updates everywhere it is used.
          </p>
        </div>
        <div>
          <Label htmlFor="img-order">Display order</Label>
          <Input
            id="img-order"
            type="number"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" isLoading={saving} onClick={() => void onSave()}>
            Save image
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
