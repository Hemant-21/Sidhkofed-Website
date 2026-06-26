'use client';

/**
 * Membership lifecycle actions. Reuses the shared publishing hooks and confirmation dialogs.
 * Permission-aware via <Can> against the shared `content.*` keys. Backend enforces RBAC.
 */

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Can } from '@/components/auth';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useLifecycleActions } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { MEMBERSHIPS_RESOURCE, MEMBERSHIP_PERMS } from '../api';
import type { MembershipDetail } from '../types';

export function MembershipLifecycleActions({ membership }: { membership: MembershipDetail }) {
  const confirm = useConfirmDialog();
  const { publish, unpublish, archive, restore } = useLifecycleActions<MembershipDetail>(MEMBERSHIPS_RESOURCE);

  const state = membership.publication_state;
  const subject = 'this membership';
  const busy = publish.isPending || unpublish.isPending || archive.isPending || restore.isPending;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Can permission={MEMBERSHIP_PERMS.update}>
        <Button asChild variant="outline" size="sm">
          <a href={`${ROUTES.memberships}/${membership.id}/edit`}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
          </a>
        </Button>
      </Can>

      {state !== 'published' ? (
        <Can permission={MEMBERSHIP_PERMS.publish}>
          <Button
            size="sm"
            isLoading={publish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmPublish(subject)) publish.mutate(membership.id);
            }}
          >
            Publish
          </Button>
        </Can>
      ) : (
        <Can permission={MEMBERSHIP_PERMS.unpublish}>
          <Button
            variant="outline"
            size="sm"
            isLoading={unpublish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmUnpublish(subject)) unpublish.mutate(membership.id);
            }}
          >
            Unpublish
          </Button>
        </Can>
      )}

      {state !== 'archived' ? (
        <Can permission={MEMBERSHIP_PERMS.archive}>
          <Button
            variant="outline"
            size="sm"
            isLoading={archive.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmArchive(subject)) archive.mutate(membership.id);
            }}
          >
            Archive
          </Button>
        </Can>
      ) : (
        <Can permission={MEMBERSHIP_PERMS.restore}>
          <Button
            variant="outline"
            size="sm"
            isLoading={restore.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmRestore(subject)) restore.mutate(membership.id);
            }}
          >
            Restore
          </Button>
        </Can>
      )}
    </div>
  );
}
