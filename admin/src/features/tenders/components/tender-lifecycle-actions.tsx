'use client';

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Can } from '@/components/auth';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useLifecycleActions } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { TENDERS_RESOURCE, TENDER_PERMS } from '../api';
import type { TenderDetail } from '../types';

export function TenderLifecycleActions({ tender }: { tender: TenderDetail }) {
  const confirm = useConfirmDialog();
  const { publish, unpublish, archive, restore } =
    useLifecycleActions<TenderDetail>(TENDERS_RESOURCE);

  const state = tender.publication_state;
  const subject = 'this tender';
  const busy = publish.isPending || unpublish.isPending || archive.isPending || restore.isPending;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Can permission={TENDER_PERMS.update}>
        <Button asChild variant="outline" size="sm">
          <a href={`${ROUTES.tenders}/${tender.id}/edit`}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
          </a>
        </Button>
      </Can>

      {state !== 'published' ? (
        <Can permission={TENDER_PERMS.publish}>
          <Button
            size="sm"
            isLoading={publish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmPublish(subject)) publish.mutate(tender.id);
            }}
          >
            Publish
          </Button>
        </Can>
      ) : (
        <Can permission={TENDER_PERMS.unpublish}>
          <Button
            variant="outline"
            size="sm"
            isLoading={unpublish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmUnpublish(subject)) unpublish.mutate(tender.id);
            }}
          >
            Unpublish
          </Button>
        </Can>
      )}

      {state !== 'archived' ? (
        <Can permission={TENDER_PERMS.archive}>
          <Button
            variant="outline"
            size="sm"
            isLoading={archive.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmArchive(subject)) archive.mutate(tender.id);
            }}
          >
            Archive
          </Button>
        </Can>
      ) : (
        <Can permission={TENDER_PERMS.restore}>
          <Button
            variant="outline"
            size="sm"
            isLoading={restore.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmRestore(subject)) restore.mutate(tender.id);
            }}
          >
            Restore
          </Button>
        </Can>
      )}
    </div>
  );
}
