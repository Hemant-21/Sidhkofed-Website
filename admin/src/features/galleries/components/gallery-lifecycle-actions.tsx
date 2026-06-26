'use client';

/**
 * Gallery lifecycle actions. Reuses the shared publishing hooks and confirmation dialogs.
 * Permission-aware via <Can> against the shared `content.*` keys. Backend enforces RBAC.
 */

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Can } from '@/components/auth';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useLifecycleActions } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { GALLERIES_RESOURCE, GALLERY_PERMS } from '../api';
import type { GalleryDetail } from '../types';

export function GalleryLifecycleActions({ gallery }: { gallery: GalleryDetail }) {
  const confirm = useConfirmDialog();
  const { publish, unpublish, archive, restore } = useLifecycleActions<GalleryDetail>(GALLERIES_RESOURCE);

  const state = gallery.publication_state;
  const subject = 'this gallery';
  const busy = publish.isPending || unpublish.isPending || archive.isPending || restore.isPending;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Can permission={GALLERY_PERMS.update}>
        <Button asChild variant="outline" size="sm">
          <a href={`${ROUTES.galleries}/${gallery.id}/edit`}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
          </a>
        </Button>
      </Can>

      {state !== 'published' ? (
        <Can permission={GALLERY_PERMS.publish}>
          <Button
            size="sm"
            isLoading={publish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmPublish(subject)) publish.mutate(gallery.id);
            }}
          >
            Publish
          </Button>
        </Can>
      ) : (
        <Can permission={GALLERY_PERMS.unpublish}>
          <Button
            variant="outline"
            size="sm"
            isLoading={unpublish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmUnpublish(subject)) unpublish.mutate(gallery.id);
            }}
          >
            Unpublish
          </Button>
        </Can>
      )}

      {state !== 'archived' ? (
        <Can permission={GALLERY_PERMS.archive}>
          <Button
            variant="outline"
            size="sm"
            isLoading={archive.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmArchive(subject)) archive.mutate(gallery.id);
            }}
          >
            Archive
          </Button>
        </Can>
      ) : (
        <Can permission={GALLERY_PERMS.restore}>
          <Button
            variant="outline"
            size="sm"
            isLoading={restore.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmRestore(subject)) restore.mutate(gallery.id);
            }}
          >
            Restore
          </Button>
        </Can>
      )}
    </div>
  );
}
