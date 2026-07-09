'use client';

/**
 * Leadership lifecycle actions. Reuses the shared publishing hooks and confirmation dialogs.
 * Permission-aware via <Can> against the shared `content.*` keys. Backend enforces RBAC.
 */

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Can } from '@/components/auth';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useLifecycleActions } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { LEADERSHIP_RESOURCE, LEADERSHIP_PERMS } from '../api';
import type { LeadershipDetail } from '../types';

export function LeadershipLifecycleActions({ leader }: { leader: LeadershipDetail }) {
  const confirm = useConfirmDialog();
  const { publish, unpublish, archive, restore } =
    useLifecycleActions<LeadershipDetail>(LEADERSHIP_RESOURCE);

  const state = leader.publication_state;
  const subject = 'this leadership entry';
  const busy = publish.isPending || unpublish.isPending || archive.isPending || restore.isPending;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Can permission={LEADERSHIP_PERMS.update}>
        <Button asChild variant="outline" size="sm">
          <a href={`${ROUTES.leadership}/${leader.id}/edit`}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
          </a>
        </Button>
      </Can>

      {state !== 'published' ? (
        <Can permission={LEADERSHIP_PERMS.publish}>
          <Button
            size="sm"
            isLoading={publish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmPublish(subject)) publish.mutate(leader.id);
            }}
          >
            Publish
          </Button>
        </Can>
      ) : (
        <Can permission={LEADERSHIP_PERMS.unpublish}>
          <Button
            variant="outline"
            size="sm"
            isLoading={unpublish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmUnpublish(subject)) unpublish.mutate(leader.id);
            }}
          >
            Unpublish
          </Button>
        </Can>
      )}

      {state !== 'archived' ? (
        <Can permission={LEADERSHIP_PERMS.archive}>
          <Button
            variant="outline"
            size="sm"
            isLoading={archive.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmArchive(subject)) archive.mutate(leader.id);
            }}
          >
            Archive
          </Button>
        </Can>
      ) : (
        <Can permission={LEADERSHIP_PERMS.restore}>
          <Button
            variant="outline"
            size="sm"
            isLoading={restore.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmRestore(subject)) restore.mutate(leader.id);
            }}
          >
            Restore
          </Button>
        </Can>
      )}
    </div>
  );
}
