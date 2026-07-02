'use client';

/**
 * Programme lifecycle actions. Reuses the shared publishing hooks (useLifecycleActions) and the
 * confirmation dialogs; gating is permission-aware via <Can> against the module-specific
 * `programmes.*` keys (backend still enforces). Lifecycle: publish / unpublish / archive / restore.
 */

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Can } from '@/components/auth';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useLifecycleActions } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { PROGRAMMES_RESOURCE, PROGRAMME_PERMS } from '../api';
import type { ProgrammeDetail } from '../types';

export function ProgrammeLifecycleActions({ programme }: { programme: ProgrammeDetail }) {
  const confirm = useConfirmDialog();
  const { publish, unpublish, archive, restore } = useLifecycleActions<ProgrammeDetail>(PROGRAMMES_RESOURCE);

  const state = programme.publication_state;
  const subject = 'this programme';
  const busy = publish.isPending || unpublish.isPending || archive.isPending || restore.isPending;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Can permission={PROGRAMME_PERMS.update}>
        <Button asChild variant="outline" size="sm">
          <a href={`${ROUTES.programmes}/${programme.id}/edit`}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
          </a>
        </Button>
      </Can>

      {state !== 'published' ? (
        <Can permission={PROGRAMME_PERMS.publish}>
          <Button
            size="sm"
            isLoading={publish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmPublish(subject)) publish.mutate(programme.id);
            }}
          >
            Publish
          </Button>
        </Can>
      ) : (
        <Can permission={PROGRAMME_PERMS.unpublish}>
          <Button
            variant="outline"
            size="sm"
            isLoading={unpublish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmUnpublish(subject)) unpublish.mutate(programme.id);
            }}
          >
            Unpublish
          </Button>
        </Can>
      )}

      {state !== 'archived' ? (
        <Can permission={PROGRAMME_PERMS.archive}>
          <Button
            variant="outline"
            size="sm"
            isLoading={archive.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmArchive(subject)) archive.mutate(programme.id);
            }}
          >
            Archive
          </Button>
        </Can>
      ) : (
        <Can permission={PROGRAMME_PERMS.restore}>
          <Button
            variant="outline"
            size="sm"
            isLoading={restore.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmRestore(subject)) restore.mutate(programme.id);
            }}
          >
            Restore
          </Button>
        </Can>
      )}
    </div>
  );
}
