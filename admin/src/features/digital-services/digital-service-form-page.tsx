'use client';

/**
 * Digital Service create/edit page. On the edit route it loads the detail first and shows a
 * skeleton/error/forbidden state. On the create route it renders the empty form.
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
import { DIGITAL_SERVICES_RESOURCE, DIGITAL_SERVICE_PERMS } from './api';
import type { DigitalServiceDetail } from './types';
import { DigitalServiceForm } from './components/digital-service-form';

const crumbs = (extra: { label: string }) => [
  { label: 'Digital Services', href: ROUTES.digitalServices },
  { label: extra.label },
];

export function DigitalServiceFormPage({ id }: { id?: string }) {
  const isEdit = Boolean(id);
  const detail = useCrudDetail<DigitalServiceDetail>(DIGITAL_SERVICES_RESOURCE, id);

  if (isEdit) {
    if (detail.isLoading) return <FormSkeleton title="Edit digital service" />;
    if (detail.isError) {
      return (
        <div className="space-y-6">
          <PageHeader title="Edit digital service" breadcrumbs={crumbs({ label: 'Edit' })} />
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        </div>
      );
    }
  }

  const service = detail.data;

  return (
    <Can
      permission={isEdit ? DIGITAL_SERVICE_PERMS.update : DIGITAL_SERVICE_PERMS.create}
      fallback={
        <div className="space-y-6">
          <PageHeader title={isEdit ? 'Edit digital service' : 'New digital service'} />
          <ForbiddenState />
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title={isEdit ? `Edit: ${service?.title_en ?? ''}` : 'New digital service'}
          description={
            isEdit
              ? 'Update this external service link. The slug stays permanent.'
              : 'Add an approved external service link (ERP, MIS, membership, …).'
          }
          breadcrumbs={crumbs({ label: isEdit ? 'Edit' : 'New' })}
        />
        <Card>
          <CardContent>
            <DigitalServiceForm service={isEdit ? service : undefined} />
          </CardContent>
        </Card>
        {isEdit && service ? (
          <p className="text-sm text-muted-foreground">
            <Link href={`${ROUTES.digitalServices}/${service.id}`} className="text-primary hover:underline">
              ← Back to digital service
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
