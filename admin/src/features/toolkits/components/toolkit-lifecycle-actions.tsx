'use client';

/**
 * Toolkit lifecycle actions. Reuses the shared publishing hooks (useLifecycleActions) and the
 * confirmation dialogs; gating is permission-aware via <Can> against the module-specific
 * `toolkits.*` keys (backend still enforces). Lifecycle: publish / unpublish / archive / restore.
 */

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Can } from '@/components/auth';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useLifecycleActions } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { TOOLKITS_RESOURCE, TOOLKIT_PERMS } from '../api';
import type { ToolkitDetail } from '../types';

export function ToolkitLifecycleActions({ toolkit }: { toolkit: ToolkitDetail }) {
  const confirm = useConfirmDialog();
  const { publish, unpublish, archive, restore } = useLifecycleActions<ToolkitDetail>(TOOLKITS_RESOURCE);

  const state = toolkit.publication_state;
  const subject = 'this toolkit';
  const busy = publish.isPending || unpublish.isPending || archive.isPending || restore.isPending;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Can permission={TOOLKIT_PERMS.update}>
        <Button asChild variant="outline" size="sm">
          <a href={`${ROUTES.toolkits}/${toolkit.id}/edit`}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
          </a>
        </Button>
      </Can>

      {state !== 'published' ? (
        <Can permission={TOOLKIT_PERMS.publish}>
          <Button
            size="sm"
            isLoading={publish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmPublish(subject)) publish.mutate(toolkit.id);
            }}
          >
            Publish
          </Button>
        </Can>
      ) : (
        <Can permission={TOOLKIT_PERMS.unpublish}>
          <Button
            variant="outline"
            size="sm"
            isLoading={unpublish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmUnpublish(subject)) unpublish.mutate(toolkit.id);
            }}
          >
            Unpublish
          </Button>
        </Can>
      )}

      {state !== 'archived' ? (
        <Can permission={TOOLKIT_PERMS.archive}>
          <Button
            variant="outline"
            size="sm"
            isLoading={archive.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmArchive(subject)) archive.mutate(toolkit.id);
            }}
          >
            Archive
          </Button>
        </Can>
      ) : (
        <Can permission={TOOLKIT_PERMS.restore}>
          <Button
            variant="outline"
            size="sm"
            isLoading={restore.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmRestore(subject)) restore.mutate(toolkit.id);
            }}
          >
            Restore
          </Button>
        </Can>
      )}
    </div>
  );
}
