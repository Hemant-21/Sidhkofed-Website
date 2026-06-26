'use client';

/**
 * Page lifecycle actions. Reuses the shared publishing hooks and confirmation dialogs.
 * Permission-aware via <Can> against the shared `content.*` keys. Backend enforces RBAC.
 */

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Can } from '@/components/auth';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useLifecycleActions } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { PAGES_RESOURCE, PAGE_PERMS } from '../api';
import type { PageDetail } from '../types';

export function PageLifecycleActions({ page }: { page: PageDetail }) {
  const confirm = useConfirmDialog();
  const { publish, unpublish, archive, restore } = useLifecycleActions<PageDetail>(PAGES_RESOURCE);

  const state = page.publication_state;
  const subject = 'this page';
  const busy = publish.isPending || unpublish.isPending || archive.isPending || restore.isPending;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Can permission={PAGE_PERMS.update}>
        <Button asChild variant="outline" size="sm">
          <a href={`${ROUTES.pages}/${page.id}/edit`}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
          </a>
        </Button>
      </Can>

      {state !== 'published' ? (
        <Can permission={PAGE_PERMS.publish}>
          <Button
            size="sm"
            isLoading={publish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmPublish(subject)) publish.mutate(page.id);
            }}
          >
            Publish
          </Button>
        </Can>
      ) : (
        <Can permission={PAGE_PERMS.unpublish}>
          <Button
            variant="outline"
            size="sm"
            isLoading={unpublish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmUnpublish(subject)) unpublish.mutate(page.id);
            }}
          >
            Unpublish
          </Button>
        </Can>
      )}

      {state !== 'archived' ? (
        <Can permission={PAGE_PERMS.archive}>
          <Button
            variant="outline"
            size="sm"
            isLoading={archive.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmArchive(subject)) archive.mutate(page.id);
            }}
          >
            Archive
          </Button>
        </Can>
      ) : (
        <Can permission={PAGE_PERMS.restore}>
          <Button
            variant="outline"
            size="sm"
            isLoading={restore.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmRestore(subject)) restore.mutate(page.id);
            }}
          >
            Restore
          </Button>
        </Can>
      )}
    </div>
  );
}
