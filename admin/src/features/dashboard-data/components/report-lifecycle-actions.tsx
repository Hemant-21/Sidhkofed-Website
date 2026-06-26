'use client';

/**
 * Dashboard report lifecycle actions. Publish/unpublish/archive/restore use the shared publishing
 * hooks against the `dashboard/reports` resource and the dedicated `dashboard.*` keys. Editing the
 * report DEFINITION (title/layout) is Super Admin only (role affordance). The backend enforces RBAC.
 */

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Can } from '@/components/auth';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useLifecycleActions } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { REPORTS_RESOURCE, DASHBOARD_PERMS } from '../api';
import { REPORT_DEFINITION_ROLES } from '../permissions';
import type { ReportDetail } from '../types';

export function ReportLifecycleActions({ report }: { report: ReportDetail }) {
  const confirm = useConfirmDialog();
  const { publish, unpublish, archive, restore } =
    useLifecycleActions<ReportDetail>(REPORTS_RESOURCE);

  const state = report.publication_state;
  const subject = 'this report';
  const busy = publish.isPending || unpublish.isPending || archive.isPending || restore.isPending;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Can role={REPORT_DEFINITION_ROLES}>
        <Button asChild variant="outline" size="sm">
          <a href={`${ROUTES.dashboardReports}/${report.id}/edit`}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> Edit definition
          </a>
        </Button>
      </Can>

      {state !== 'published' ? (
        <Can permission={DASHBOARD_PERMS.publish}>
          <Button
            size="sm"
            isLoading={publish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmPublish(subject)) publish.mutate(report.id);
            }}
          >
            Publish
          </Button>
        </Can>
      ) : (
        <Can permission={DASHBOARD_PERMS.unpublish}>
          <Button
            variant="outline"
            size="sm"
            isLoading={unpublish.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmUnpublish(subject)) unpublish.mutate(report.id);
            }}
          >
            Unpublish
          </Button>
        </Can>
      )}

      {state !== 'archived' ? (
        <Can permission={DASHBOARD_PERMS.archive}>
          <Button
            variant="outline"
            size="sm"
            isLoading={archive.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmArchive(subject)) archive.mutate(report.id);
            }}
          >
            Archive
          </Button>
        </Can>
      ) : (
        <Can permission={DASHBOARD_PERMS.restore}>
          <Button
            variant="outline"
            size="sm"
            isLoading={restore.isPending}
            disabled={busy}
            onClick={async () => {
              if (await confirm.confirmRestore(subject)) restore.mutate(report.id);
            }}
          >
            Restore
          </Button>
        </Can>
      )}
    </div>
  );
}
