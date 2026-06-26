'use client';

/**
 * Page create/edit page. On the edit route it loads the detail first and shows a
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
import { PAGES_RESOURCE, PAGE_PERMS } from './api';
import type { PageDetail } from './types';
import { PageForm } from './components/page-form';

const crumbs = (extra: { label: string }) => [{ label: 'Pages', href: ROUTES.pages }, { label: extra.label }];

export function PageFormPage({ id }: { id?: string }) {
  const isEdit = Boolean(id);
  const detail = useCrudDetail<PageDetail>(PAGES_RESOURCE, id);

  if (isEdit) {
    if (detail.isLoading) return <FormSkeleton title="Edit page" />;
    if (detail.isError) {
      return (
        <div className="space-y-6">
          <PageHeader title="Edit page" breadcrumbs={crumbs({ label: 'Edit' })} />
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        </div>
      );
    }
  }

  const page = detail.data;

  return (
    <Can
      permission={isEdit ? PAGE_PERMS.update : PAGE_PERMS.create}
      fallback={
        <div className="space-y-6">
          <PageHeader title={isEdit ? 'Edit page' : 'New page'} />
          <ForbiddenState />
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title={isEdit ? `Edit: ${page?.title_en ?? ''}` : 'New page'}
          description={
            isEdit
              ? 'Update this page. The slug stays permanent.'
              : 'Create a static or institutional page.'
          }
          breadcrumbs={crumbs({ label: isEdit ? 'Edit' : 'New' })}
        />
        <Card>
          <CardContent>
            <PageForm page={isEdit ? page : undefined} />
          </CardContent>
        </Card>
        {isEdit && page ? (
          <p className="text-sm text-muted-foreground">
            <Link href={`${ROUTES.pages}/${page.id}`} className="text-primary hover:underline">
              ← Back to page
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
