'use client';

/**
 * Programme create/edit page. On the edit route it loads the programme detail first (shared
 * useCrudDetail) and shows a skeleton/error/forbidden state; on the create route it renders the
 * empty form. The heavy lifting is in <ProgrammeForm>. Permission gating is enforced by the route's
 * <ProtectedRoute> ancestor plus <Can>; the backend remains authoritative.
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
import { PROGRAMMES_RESOURCE, PROGRAMME_PERMS } from './api';
import type { ProgrammeDetail } from './types';
import { ProgrammeForm } from './components/programme-form';

const crumbs = (extra: { label: string }) => [{ label: 'Programmes', href: ROUTES.programmes }, { label: extra.label }];

export function ProgrammeFormPage({ id }: { id?: string }) {
  const isEdit = Boolean(id);
  const detail = useCrudDetail<ProgrammeDetail>(PROGRAMMES_RESOURCE, id);

  if (isEdit) {
    if (detail.isLoading) return <FormSkeleton title="Edit programme" />;
    if (detail.isError) {
      return (
        <div className="space-y-6">
          <PageHeader title="Edit programme" breadcrumbs={crumbs({ label: 'Edit' })} />
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        </div>
      );
    }
  }

  const programme = detail.data;

  return (
    <Can
      permission={isEdit ? PROGRAMME_PERMS.update : PROGRAMME_PERMS.create}
      fallback={
        <div className="space-y-6">
          <PageHeader title={isEdit ? 'Edit programme' : 'New programme'} />
          <ForbiddenState />
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title={isEdit ? `Edit: ${programme?.title_en ?? ''}` : 'New programme'}
          description={isEdit ? 'Update this programme. The slug stays permanent.' : 'Create a new programme or scheme record.'}
          breadcrumbs={crumbs({ label: isEdit ? 'Edit' : 'New' })}
        />
        <Card>
          <CardContent>
            <ProgrammeForm programme={isEdit ? programme : undefined} />
          </CardContent>
        </Card>
        {isEdit && programme ? (
          <p className="text-sm text-muted-foreground">
            <Link href={`${ROUTES.programmes}/${programme.id}`} className="text-primary hover:underline">
              ← Back to programme
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
