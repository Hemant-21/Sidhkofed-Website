'use client';

/**
 * News lifecycle actions: publish / unpublish / archive / restore. Reuses the shared lifecycle
 * hooks + confirmation dialogs; permission-gated via <Can> (backend still enforces). News has no
 * create/complete/cancel — only the standard "P" lifecycle plus edit.
 */

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Can } from '@/components/auth';
import { useLifecycleActions } from '@/hooks/crud';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { ROUTES } from '@/constants/routes';
import { NEWS_RESOURCE, CONTENT_PERMS } from '../api';
import type { NewsDetail } from '../types';

export function NewsLifecycleActions({ news }: { news: NewsDetail }) {
  const confirm = useConfirmDialog();
  const { publish, unpublish, archive, restore } = useLifecycleActions<NewsDetail>(NEWS_RESOURCE);
  const state = news.publication_state;
  const subject = 'this news';
  const busy = publish.isPending || unpublish.isPending || archive.isPending || restore.isPending;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Can permission={CONTENT_PERMS.update}>
        <Button asChild variant="outline" size="sm">
          <a href={`${ROUTES.news}/${news.id}/edit`}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
          </a>
        </Button>
      </Can>

      {state !== 'published' ? (
        <Can permission={CONTENT_PERMS.publish}>
          <Button size="sm" isLoading={publish.isPending} disabled={busy} onClick={async () => {
            if (await confirm.confirmPublish(subject)) publish.mutate(news.id);
          }}>
            Publish
          </Button>
        </Can>
      ) : (
        <Can permission={CONTENT_PERMS.unpublish}>
          <Button variant="outline" size="sm" isLoading={unpublish.isPending} disabled={busy} onClick={async () => {
            if (await confirm.confirmUnpublish(subject)) unpublish.mutate(news.id);
          }}>
            Unpublish
          </Button>
        </Can>
      )}

      {state !== 'archived' ? (
        <Can permission={CONTENT_PERMS.archive}>
          <Button variant="outline" size="sm" isLoading={archive.isPending} disabled={busy} onClick={async () => {
            if (await confirm.confirmArchive(subject)) archive.mutate(news.id);
          }}>
            Archive
          </Button>
        </Can>
      ) : (
        <Can permission={CONTENT_PERMS.restore}>
          <Button variant="outline" size="sm" isLoading={restore.isPending} disabled={busy} onClick={async () => {
            if (await confirm.confirmRestore(subject)) restore.mutate(news.id);
          }}>
            Restore
          </Button>
        </Can>
      )}
    </div>
  );
}
