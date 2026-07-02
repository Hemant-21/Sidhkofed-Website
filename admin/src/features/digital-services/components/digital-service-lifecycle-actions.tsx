'use client';

/**
 * Digital Service lifecycle actions. Reuses the shared publishing hooks and confirmation dialogs.
 * Permission-aware via <Can> against the shared `content.*` keys. Backend enforces RBAC.
 */

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Can } from '@/components/auth';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useLifecycleActions } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { DIGITAL_SERVICES_RESOURCE, DIGITAL_SERVICE_PERMS } from '../api';
import type { DigitalServiceDetail } from '../types';

export function DigitalServiceLifecycleActions({ service }: { service: DigitalServiceDetail }) {
  const confirm = useConfirmDialog();
  const { publish, unpublish, archive, restore } =
    useLifecycleActions<DigitalServiceDetail>(DIGITAL_SERVICES_RESOURCE);

  const state = service.publication_state;
  const subject = 'this digital service';
  const busy = publish.isPending || unpublish.isPending || archive.isPending || restore.isPending;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Can permission={DIGITAL_SERVICE_PERMS.update}>
        <Button asChild variant="outline" size="sm">
          <a href={`${ROUTES.digitalServices}/${service.id}/edit`}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
          </a>
        </Button>
      </Can>

      {state !== 'published' ? (
        <Can permission={DIGITAL_SERVICE_PERMS.publish}>
          <Button
            size="sm"
            isLoading={publish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmPublish(subject)) publish.mutate(service.id);
            }}
          >
            Publish
          </Button>
        </Can>
      ) : (
        <Can permission={DIGITAL_SERVICE_PERMS.unpublish}>
          <Button
            variant="outline"
            size="sm"
            isLoading={unpublish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmUnpublish(subject)) unpublish.mutate(service.id);
            }}
          >
            Unpublish
          </Button>
        </Can>
      )}

      {state !== 'archived' ? (
        <Can permission={DIGITAL_SERVICE_PERMS.archive}>
          <Button
            variant="outline"
            size="sm"
            isLoading={archive.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmArchive(subject)) archive.mutate(service.id);
            }}
          >
            Archive
          </Button>
        </Can>
      ) : (
        <Can permission={DIGITAL_SERVICE_PERMS.restore}>
          <Button
            variant="outline"
            size="sm"
            isLoading={restore.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmRestore(subject)) restore.mutate(service.id);
            }}
          >
            Restore
          </Button>
        </Can>
      )}
    </div>
  );
}
