'use client';

/**
 * Institution create/edit page. On the edit route it loads the institution detail first (shared
 * useCrudDetail) and shows a skeleton/error/forbidden state; on the create route it renders the
 * empty form. The heavy lifting is in <InstitutionForm>. Permission gating is enforced by the
 * route's <ProtectedRoute> ancestor plus <Can>; the backend remains authoritative.
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
import { INSTITUTIONS_RESOURCE, CONTENT_PERMS } from './api';
import type { InstitutionDetail } from './types';
import { InstitutionForm } from './components/institution-form';

const crumbs = (extra: { label: string }) => [{ label: 'Institutions', href: ROUTES.institutions }, { label: extra.label }];

export function InstitutionFormPage({ id }: { id?: string }) {
  const isEdit = Boolean(id);
  const detail = useCrudDetail<InstitutionDetail>(INSTITUTIONS_RESOURCE, id);

  if (isEdit) {
    if (detail.isLoading) return <FormSkeleton title="Edit institution" />;
    if (detail.isError) {
      return (
        <div className="space-y-6">
          <PageHeader title="Edit institution" breadcrumbs={crumbs({ label: 'Edit' })} />
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        </div>
      );
    }
  }

  const institution = detail.data;

  return (
    <Can
      permission={isEdit ? CONTENT_PERMS.update : CONTENT_PERMS.create}
      fallback={
        <div className="space-y-6">
          <PageHeader title={isEdit ? 'Edit institution' : 'New institution'} />
          <ForbiddenState />
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title={isEdit ? `Edit: ${institution?.name_en ?? ''}` : 'New institution'}
          description={isEdit ? 'Update this institution. The slug stays permanent.' : 'Add a new partner or institution record.'}
          breadcrumbs={crumbs({ label: isEdit ? 'Edit' : 'New' })}
        />
        <Card>
          <CardContent>
            <InstitutionForm institution={isEdit ? institution : undefined} />
          </CardContent>
        </Card>
        {isEdit && institution ? (
          <p className="text-sm text-muted-foreground">
            <Link href={`${ROUTES.institutions}/${institution.id}`} className="text-primary hover:underline">
              ← Back to institution
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
