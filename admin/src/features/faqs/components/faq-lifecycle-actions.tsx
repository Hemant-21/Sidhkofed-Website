'use client';

/**
 * FAQ lifecycle actions. Reuses the shared publishing hooks and confirmation dialogs.
 * Permission-aware via <Can> against the shared `content.*` keys. Backend enforces RBAC.
 */

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Can } from '@/components/auth';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useLifecycleActions } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { FAQS_RESOURCE, FAQ_PERMS } from '../api';
import type { FaqDetail } from '../types';

export function FaqLifecycleActions({ faq }: { faq: FaqDetail }) {
  const confirm = useConfirmDialog();
  const { publish, unpublish, archive, restore } = useLifecycleActions<FaqDetail>(FAQS_RESOURCE);

  const state = faq.publication_state;
  const subject = 'this FAQ';
  const busy = publish.isPending || unpublish.isPending || archive.isPending || restore.isPending;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Can permission={FAQ_PERMS.update}>
        <Button asChild variant="outline" size="sm">
          <a href={`${ROUTES.faqs}/${faq.id}/edit`}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
          </a>
        </Button>
      </Can>

      {state !== 'published' ? (
        <Can permission={FAQ_PERMS.publish}>
          <Button
            size="sm"
            isLoading={publish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmPublish(subject)) publish.mutate(faq.id);
            }}
          >
            Publish
          </Button>
        </Can>
      ) : (
        <Can permission={FAQ_PERMS.unpublish}>
          <Button
            variant="outline"
            size="sm"
            isLoading={unpublish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmUnpublish(subject)) unpublish.mutate(faq.id);
            }}
          >
            Unpublish
          </Button>
        </Can>
      )}

      {state !== 'archived' ? (
        <Can permission={FAQ_PERMS.archive}>
          <Button
            variant="outline"
            size="sm"
            isLoading={archive.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmArchive(subject)) archive.mutate(faq.id);
            }}
          >
            Archive
          </Button>
        </Can>
      ) : (
        <Can permission={FAQ_PERMS.restore}>
          <Button
            variant="outline"
            size="sm"
            isLoading={restore.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmRestore(subject)) restore.mutate(faq.id);
            }}
          >
            Restore
          </Button>
        </Can>
      )}
    </div>
  );
}
