'use client';

/**
 * Event create/edit page. On the edit route it loads the event detail first (shared useCrudDetail)
 * and shows a skeleton/error/forbidden state; on the create route it renders the empty form. The
 * heavy lifting is in <EventForm>. Permission gating is enforced by the route's <ProtectedRoute>
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
import { EVENTS_RESOURCE } from './api';
import { CONTENT_PERMS } from './permissions';
import type { EventDetail } from './types';
import { EventForm } from './components/event-form';

const crumbs = (extra: { label: string }) => [
  { label: 'Events', href: ROUTES.events },
  { label: extra.label },
];

export function EventFormPage({ id }: { id?: string }) {
  const isEdit = Boolean(id);
  const detail = useCrudDetail<EventDetail>(EVENTS_RESOURCE, id);

  if (isEdit) {
    if (detail.isLoading) return <FormSkeleton title="Edit event" />;
    if (detail.isError) {
      return (
        <div className="space-y-6">
          <PageHeader title="Edit event" breadcrumbs={crumbs({ label: 'Edit' })} />
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        </div>
      );
    }
  }

  const event = detail.data;

  return (
    <Can
      permission={isEdit ? CONTENT_PERMS.update : CONTENT_PERMS.create}
      fallback={
        <div className="space-y-6">
          <PageHeader title={isEdit ? 'Edit event' : 'New event'} />
          <ForbiddenState />
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title={isEdit ? `Edit: ${event?.title_en ?? ''}` : 'New event'}
          description={isEdit ? 'Update this event. The slug stays permanent.' : 'Create a new institutional activity.'}
          breadcrumbs={crumbs({ label: isEdit ? 'Edit' : 'New' })}
        />
        <Card>
          <CardContent>
            <EventForm event={isEdit ? event : undefined} />
          </CardContent>
        </Card>
        {isEdit && event ? (
          <p className="text-sm text-muted-foreground">
            <Link href={`${ROUTES.events}/${event.id}`} className="text-primary hover:underline">
              ← Back to event
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
