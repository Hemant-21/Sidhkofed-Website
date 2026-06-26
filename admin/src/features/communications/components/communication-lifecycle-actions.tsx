'use client';

/**
 * Official Communication lifecycle actions. Reuses the shared publishing hooks and confirmation
 * dialogs. Permission-aware via <Can> against `communications.*` keys. Backend enforces RBAC.
 */

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Can } from '@/components/auth';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useLifecycleActions } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { COMMUNICATIONS_RESOURCE, COMMUNICATION_PERMS } from '../api';
import type { CommunicationDetail } from '../types';

export function CommunicationLifecycleActions({ communication }: { communication: CommunicationDetail }) {
  const confirm = useConfirmDialog();
  const { publish, unpublish, archive, restore } =
    useLifecycleActions<CommunicationDetail>(COMMUNICATIONS_RESOURCE);

  const state = communication.publication_state;
  const subject = 'this communication';
  const busy =
    publish.isPending || unpublish.isPending || archive.isPending || restore.isPending;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Can permission={COMMUNICATION_PERMS.update}>
        <Button asChild variant="outline" size="sm">
          <a href={`${ROUTES.communications}/${communication.id}/edit`}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
          </a>
        </Button>
      </Can>

      {state !== 'published' ? (
        <Can permission={COMMUNICATION_PERMS.publish}>
          <Button
            size="sm"
            isLoading={publish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmPublish(subject)) publish.mutate(communication.id);
            }}
          >
            Publish
          </Button>
        </Can>
      ) : (
        <Can permission={COMMUNICATION_PERMS.unpublish}>
          <Button
            variant="outline"
            size="sm"
            isLoading={unpublish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmUnpublish(subject)) unpublish.mutate(communication.id);
            }}
          >
            Unpublish
          </Button>
        </Can>
      )}

      {state !== 'archived' ? (
        <Can permission={COMMUNICATION_PERMS.archive}>
          <Button
            variant="outline"
            size="sm"
            isLoading={archive.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmArchive(subject)) archive.mutate(communication.id);
            }}
          >
            Archive
          </Button>
        </Can>
      ) : (
        <Can permission={COMMUNICATION_PERMS.restore}>
          <Button
            variant="outline"
            size="sm"
            isLoading={restore.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmRestore(subject)) restore.mutate(communication.id);
            }}
          >
            Restore
          </Button>
        </Can>
      )}
    </div>
  );
}
