'use client';

/**
 * Official Communication create/edit page. On the edit route it loads the detail first and shows
 * a skeleton/error/forbidden state. On the create route it renders the empty form.
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
import { COMMUNICATIONS_RESOURCE, COMMUNICATION_PERMS } from './api';
import type { CommunicationDetail } from './types';
import { CommunicationForm } from './components/communication-form';

const crumbs = (extra: { label: string }) => [
  { label: 'Official Communications', href: ROUTES.communications },
  { label: extra.label },
];

export function CommunicationFormPage({ id }: { id?: string }) {
  const isEdit = Boolean(id);
  const detail = useCrudDetail<CommunicationDetail>(COMMUNICATIONS_RESOURCE, id);

  if (isEdit) {
    if (detail.isLoading) return <FormSkeleton title="Edit communication" />;
    if (detail.isError) {
      return (
        <div className="space-y-6">
          <PageHeader title="Edit communication" breadcrumbs={crumbs({ label: 'Edit' })} />
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        </div>
      );
    }
  }

  const communication = detail.data;

  return (
    <Can
      permission={isEdit ? COMMUNICATION_PERMS.update : COMMUNICATION_PERMS.create}
      fallback={
        <div className="space-y-6">
          <PageHeader title={isEdit ? 'Edit communication' : 'New communication'} />
          <ForbiddenState />
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title={isEdit ? `Edit: ${communication?.title_en ?? ''}` : 'New communication'}
          description={
            isEdit
              ? 'Update this communication. The slug stays permanent.'
              : 'Create a notice, circular, office order, or other official communication.'
          }
          breadcrumbs={crumbs({ label: isEdit ? 'Edit' : 'New' })}
        />
        <Card>
          <CardContent>
            <CommunicationForm communication={isEdit ? communication : undefined} />
          </CardContent>
        </Card>
        {isEdit && communication ? (
          <p className="text-sm text-muted-foreground">
            <Link
              href={`${ROUTES.communications}/${communication.id}`}
              className="text-primary hover:underline"
            >
              ← Back to communication
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
