'use client';

/**
 * Toolkit create/edit page. On the edit route it loads the toolkit detail first (shared
 * useCrudDetail) and shows a skeleton/error/forbidden state; on the create route it renders the
 * empty form. The heavy lifting is in <ToolkitForm>. Catalogue items are managed on the detail page
 * (they need a saved toolkit id). Permission gating is enforced by the route's <ProtectedRoute>
 * ancestor plus <Can>; the backend remains authoritative.
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
import { TOOLKITS_RESOURCE, TOOLKIT_PERMS } from './api';
import type { ToolkitDetail } from './types';
import { ToolkitForm } from './components/toolkit-form';

const crumbs = (extra: { label: string }) => [{ label: 'Toolkits', href: ROUTES.toolkits }, { label: extra.label }];

export function ToolkitFormPage({ id }: { id?: string }) {
  const isEdit = Boolean(id);
  const detail = useCrudDetail<ToolkitDetail>(TOOLKITS_RESOURCE, id);

  if (isEdit) {
    if (detail.isLoading) return <FormSkeleton title="Edit toolkit" />;
    if (detail.isError) {
      return (
        <div className="space-y-6">
          <PageHeader title="Edit toolkit" breadcrumbs={crumbs({ label: 'Edit' })} />
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        </div>
      );
    }
  }

  const toolkit = detail.data;

  return (
    <Can
      permission={isEdit ? TOOLKIT_PERMS.update : TOOLKIT_PERMS.create}
      fallback={
        <div className="space-y-6">
          <PageHeader title={isEdit ? 'Edit toolkit' : 'New toolkit'} />
          <ForbiddenState />
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title={isEdit ? `Edit: ${toolkit?.title_en ?? ''}` : 'New toolkit'}
          description={isEdit ? 'Update this toolkit. Manage its items from the detail page.' : 'Create a new toolkit definition.'}
          breadcrumbs={crumbs({ label: isEdit ? 'Edit' : 'New' })}
        />
        <Card>
          <CardContent>
            <ToolkitForm toolkit={isEdit ? toolkit : undefined} />
          </CardContent>
        </Card>
        {isEdit && toolkit ? (
          <p className="text-sm text-muted-foreground">
            <Link href={`${ROUTES.toolkits}/${toolkit.id}`} className="text-primary hover:underline">
              ← Back to toolkit
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
