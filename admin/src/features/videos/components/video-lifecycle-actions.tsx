'use client';

/**
 * Video lifecycle actions. Reuses the shared publishing hooks (useLifecycleActions) and the
 * confirmation dialogs; gating is permission aware via <Can> (backend still enforces, including
 * the ≤3 homepage-videos cap which returns 409 on publish — surfaced as an error toast).
 */

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Can } from '@/components/auth';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useLifecycleActions } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { VIDEOS_RESOURCE, CONTENT_PERMS } from '../api';
import type { Video } from '../types';

export function VideoLifecycleActions({ video }: { video: Video }) {
  const confirm = useConfirmDialog();
  const { publish, unpublish, archive, restore } = useLifecycleActions<Video>(VIDEOS_RESOURCE);

  const state = video.publication_state;
  const subject = 'this video';
  const busy = publish.isPending || unpublish.isPending || archive.isPending || restore.isPending;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Can permission={CONTENT_PERMS.update}>
        <Button asChild variant="outline" size="sm">
          <a href={`${ROUTES.videos}/${video.id}/edit`}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
          </a>
        </Button>
      </Can>

      {state !== 'published' ? (
        <Can permission={CONTENT_PERMS.publish}>
          <Button
            size="sm"
            isLoading={publish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmPublish(subject)) publish.mutate(video.id);
            }}
          >
            Publish
          </Button>
        </Can>
      ) : (
        <Can permission={CONTENT_PERMS.unpublish}>
          <Button
            variant="outline"
            size="sm"
            isLoading={unpublish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmUnpublish(subject)) unpublish.mutate(video.id);
            }}
          >
            Unpublish
          </Button>
        </Can>
      )}

      {state !== 'archived' ? (
        <Can permission={CONTENT_PERMS.archive}>
          <Button
            variant="outline"
            size="sm"
            isLoading={archive.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmArchive(subject)) archive.mutate(video.id);
            }}
          >
            Archive
          </Button>
        </Can>
      ) : (
        <Can permission={CONTENT_PERMS.restore}>
          <Button
            variant="outline"
            size="sm"
            isLoading={restore.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmRestore(subject)) restore.mutate(video.id);
            }}
          >
            Restore
          </Button>
        </Can>
      )}
    </div>
  );
}
