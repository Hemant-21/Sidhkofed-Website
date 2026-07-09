'use client';

/**
 * Leadership create/edit page. On the edit route it loads the detail first and shows a
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
import { LEADERSHIP_RESOURCE, LEADERSHIP_PERMS } from './api';
import type { LeadershipDetail } from './types';
import { LeadershipForm } from './components/leadership-form';

const crumbs = (extra: { label: string }) => [
  { label: 'Leadership', href: ROUTES.leadership },
  { label: extra.label },
];

export function LeadershipFormPage({ id }: { id?: string }) {
  const isEdit = Boolean(id);
  const detail = useCrudDetail<LeadershipDetail>(LEADERSHIP_RESOURCE, id);

  if (isEdit) {
    if (detail.isLoading) return <FormSkeleton title="Edit leadership entry" />;
    if (detail.isError) {
      return (
        <div className="space-y-6">
          <PageHeader title="Edit leadership entry" breadcrumbs={crumbs({ label: 'Edit' })} />
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        </div>
      );
    }
  }

  const leader = detail.data;

  return (
    <Can
      permission={isEdit ? LEADERSHIP_PERMS.update : LEADERSHIP_PERMS.create}
      fallback={
        <div className="space-y-6">
          <PageHeader title={isEdit ? 'Edit leadership entry' : 'New leadership entry'} />
          <ForbiddenState />
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title={isEdit ? `Edit: ${leader?.name_en ?? ''}` : 'New leadership entry'}
          description={
            isEdit
              ? 'Update this leadership profile. The slug stays permanent.'
              : 'Add a new leadership profile shown on the public site.'
          }
          breadcrumbs={crumbs({ label: isEdit ? 'Edit' : 'New' })}
        />
        <Card>
          <CardContent>
            <LeadershipForm leader={isEdit ? leader : undefined} />
          </CardContent>
        </Card>
        {isEdit && leader ? (
          <p className="text-sm text-muted-foreground">
            <Link href={`${ROUTES.leadership}/${leader.id}`} className="text-primary hover:underline">
              ← Back to leadership entry
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
