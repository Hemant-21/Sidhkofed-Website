'use client';

/**
 * Institution lifecycle actions. Reuses the shared publishing hooks (useLifecycleActions) and the
 * confirmation dialogs; gating is permission-aware via <Can> (backend still enforces). Lifecycle:
 * publish / unpublish / archive / restore. Authorized with the generic `content.*` permission set.
 */

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Can } from '@/components/auth';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useLifecycleActions } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { INSTITUTIONS_RESOURCE, CONTENT_PERMS } from '../api';
import type { InstitutionDetail } from '../types';

export function InstitutionLifecycleActions({ institution }: { institution: InstitutionDetail }) {
  const confirm = useConfirmDialog();
  const { publish, unpublish, archive, restore } = useLifecycleActions<InstitutionDetail>(INSTITUTIONS_RESOURCE);

  const state = institution.publication_state;
  const subject = 'this institution';
  const busy = publish.isPending || unpublish.isPending || archive.isPending || restore.isPending;

  return (
    <div className="flex flex-wrap items-center gap-2">
        <Can permission={CONTENT_PERMS.update}>
          <Button asChild variant="outline" size="sm">
            <a href={`${ROUTES.institutions}/${institution.id}/edit`}>
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
                if (await confirm.confirmPublish(subject)) publish.mutate(institution.id);
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
                if (await confirm.confirmUnpublish(subject)) unpublish.mutate(institution.id);
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
                if (await confirm.confirmArchive(subject)) archive.mutate(institution.id);
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
                if (await confirm.confirmRestore(subject)) restore.mutate(institution.id);
              }}
            >
              Restore
            </Button>
          </Can>
        )}
    </div>
  );
}
