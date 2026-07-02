'use client';

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Can } from '@/components/auth';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useLifecycleActions } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { PROCUREMENT_RESOURCE, PROCUREMENT_PERMS } from '../api';
import type { ProcurementDetail } from '../types';

export function ProcurementLifecycleActions({ procurement }: { procurement: ProcurementDetail }) {
  const confirm = useConfirmDialog();
  const { publish, unpublish, archive, restore } =
    useLifecycleActions<ProcurementDetail>(PROCUREMENT_RESOURCE);

  const state = procurement.publication_state;
  const subject = 'this procurement update';
  const busy = publish.isPending || unpublish.isPending || archive.isPending || restore.isPending;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Can permission={PROCUREMENT_PERMS.update}>
        <Button asChild variant="outline" size="sm">
          <a href={`${ROUTES.procurement}/${procurement.id}/edit`}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
          </a>
        </Button>
      </Can>

      {state !== 'published' ? (
        <Can permission={PROCUREMENT_PERMS.publish}>
          <Button
            size="sm"
            isLoading={publish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmPublish(subject)) publish.mutate(procurement.id);
            }}
          >
            Publish
          </Button>
        </Can>
      ) : (
        <Can permission={PROCUREMENT_PERMS.unpublish}>
          <Button
            variant="outline"
            size="sm"
            isLoading={unpublish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmUnpublish(subject)) unpublish.mutate(procurement.id);
            }}
          >
            Unpublish
          </Button>
        </Can>
      )}

      {state !== 'archived' ? (
        <Can permission={PROCUREMENT_PERMS.archive}>
          <Button
            variant="outline"
            size="sm"
            isLoading={archive.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmArchive(subject)) archive.mutate(procurement.id);
            }}
          >
            Archive
          </Button>
        </Can>
      ) : (
        <Can permission={PROCUREMENT_PERMS.restore}>
          <Button
            variant="outline"
            size="sm"
            isLoading={restore.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmRestore(subject)) restore.mutate(procurement.id);
            }}
          >
            Restore
          </Button>
        </Can>
      )}
    </div>
  );
}
