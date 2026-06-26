'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/layout/card';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { ForbiddenState } from '@/components/feedback/forbidden-state';
import { Can } from '@/components/auth';
import { useCrudDetail } from '@/hooks/crud';
import { ROUTES } from '@/constants/routes';
import { PROCUREMENT_RESOURCE, PROCUREMENT_PERMS } from './api';
import type { ProcurementDetail } from './types';
import { ProcurementForm } from './components/procurement-form';

const crumbs = (extra: { label: string }) => [
  { label: 'Procurement Updates', href: ROUTES.procurement },
  { label: extra.label },
];

export function ProcurementFormPage({ id }: { id?: string }) {
  const isEdit = Boolean(id);
  const detail = useCrudDetail<ProcurementDetail>(PROCUREMENT_RESOURCE, id);

  if (isEdit) {
    if (detail.isLoading) return <FormSkeleton title="Edit procurement update" />;
    if (detail.isError) {
      return (
        <div className="space-y-6">
          <PageHeader title="Edit procurement update" breadcrumbs={crumbs({ label: 'Edit' })} />
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        </div>
      );
    }
  }

  const procurement = detail.data;

  return (
    <Can
      permission={isEdit ? PROCUREMENT_PERMS.update : PROCUREMENT_PERMS.create}
      fallback={
        <div className="space-y-6">
          <PageHeader title={isEdit ? 'Edit procurement update' : 'New procurement update'} />
          <ForbiddenState />
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title={isEdit ? `Edit: ${procurement?.title_en ?? ''}` : 'New procurement update'}
          description={
            isEdit
              ? 'Update this record. The slug stays permanent. Rate/unit are display values only.'
              : 'Create a procurement rate, announcement, schedule, centre update, or trade opportunity.'
          }
          breadcrumbs={crumbs({ label: isEdit ? 'Edit' : 'New' })}
        />
        <Card>
          <CardContent>
            <ProcurementForm procurement={isEdit ? procurement : undefined} />
          </CardContent>
        </Card>
        {isEdit && procurement ? (
          <p className="text-sm text-muted-foreground">
            <Link href={`${ROUTES.procurement}/${procurement.id}`} className="text-primary hover:underline">
              ← Back to procurement update
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
