'use client';

/**
 * Dashboard report definition create/edit page. Report definitions are Super Admin only (the report
 * builder is out of scope; only the fixed catalog + presentation are editable). On the edit route it
 * loads the detail first and shows a skeleton/error/forbidden state.
 */

import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/layout/card';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { ForbiddenState } from '@/components/feedback/forbidden-state';
import { Can } from '@/components/auth';
import { useCrudDetail } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { REPORTS_RESOURCE } from './api';
import { REPORT_DEFINITION_ROLES } from './permissions';
import type { ReportDetail } from './types';
import { ReportForm } from './components/report-form';

const crumbs = (extra: { label: string }) => [
  { label: 'Dashboard', href: ROUTES.dashboard },
  { label: 'Reports', href: ROUTES.dashboardReports },
  { label: extra.label },
];

export function ReportFormPage({ id }: { id?: string }) {
  const isEdit = Boolean(id);
  const detail = useCrudDetail<ReportDetail>(REPORTS_RESOURCE, id);

  if (isEdit) {
    if (detail.isLoading) return <FormSkeleton title="Edit report" />;
    if (detail.isError) {
      return (
        <div className="space-y-6">
          <PageHeader title="Edit report" breadcrumbs={crumbs({ label: 'Edit' })} />
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        </div>
      );
    }
  }

  const report = detail.data;

  return (
    <Can
      role={REPORT_DEFINITION_ROLES}
      fallback={
        <div className="space-y-6">
          <PageHeader title={isEdit ? 'Edit report' : 'New report'} />
          <ForbiddenState />
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title={isEdit ? `Edit: ${report?.title_en ?? ''}` : 'New dashboard report'}
          description={
            isEdit
              ? 'Update this fixed report definition. The report key stays permanent.'
              : 'Create a definition for one of the fixed dashboard reports.'
          }
          breadcrumbs={crumbs({ label: isEdit ? 'Edit' : 'New' })}
        />
        <Card>
          <CardContent>
            <ReportForm report={isEdit ? report : undefined} />
          </CardContent>
        </Card>
        {isEdit && report ? (
          <p className="text-sm text-muted-foreground">
            <Link
              href={`${ROUTES.dashboardReports}/${report.id}`}
              className="text-primary hover:underline"
            >
              ← Back to report
            </Link>
          </p>
        ) : null}
      </div>
    </Can>
  );
}

function FormSkeleton({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} />
      <Card>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
