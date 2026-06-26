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
import { TENDERS_RESOURCE, TENDER_PERMS } from './api';
import type { TenderDetail } from './types';
import { TenderForm } from './components/tender-form';

const crumbs = (extra: { label: string }) => [
  { label: 'Tenders', href: ROUTES.tenders },
  { label: extra.label },
];

export function TenderFormPage({ id }: { id?: string }) {
  const isEdit = Boolean(id);
  const detail = useCrudDetail<TenderDetail>(TENDERS_RESOURCE, id);

  if (isEdit) {
    if (detail.isLoading) return <FormSkeleton title="Edit tender" />;
    if (detail.isError) {
      return (
        <div className="space-y-6">
          <PageHeader title="Edit tender" breadcrumbs={crumbs({ label: 'Edit' })} />
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        </div>
      );
    }
  }

  const tender = detail.data;

  return (
    <Can
      permission={isEdit ? TENDER_PERMS.update : TENDER_PERMS.create}
      fallback={
        <div className="space-y-6">
          <PageHeader title={isEdit ? 'Edit tender' : 'New tender'} />
          <ForbiddenState />
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title={isEdit ? `Edit: ${tender?.title_en ?? ''}` : 'New tender'}
          description={
            isEdit
              ? 'Update this tender. The slug stays permanent.'
              : 'Create a tender record with structured metadata and GeM portal link.'
          }
          breadcrumbs={crumbs({ label: isEdit ? 'Edit' : 'New' })}
        />
        <Card>
          <CardContent>
            <TenderForm tender={isEdit ? tender : undefined} />
          </CardContent>
        </Card>
        {isEdit && tender ? (
          <p className="text-sm text-muted-foreground">
            <Link href={`${ROUTES.tenders}/${tender.id}`} className="text-primary hover:underline">
              ← Back to tender
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
