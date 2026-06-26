'use client';

/**
 * Video create/edit page. On the edit route it loads the video detail first (shared useCrudDetail)
 * and shows a skeleton/error/forbidden state; on the create route it renders the empty form. The
 * heavy lifting is in <VideoForm>. Permission gating is enforced by the route's <ProtectedRoute>
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
import { VIDEOS_RESOURCE, CONTENT_PERMS } from './api';
import type { Video } from './types';
import { VideoForm } from './components/video-form';

const crumbs = (extra: { label: string }) => [{ label: 'Videos', href: ROUTES.videos }, { label: extra.label }];

export function VideoFormPage({ id }: { id?: string }) {
  const isEdit = Boolean(id);
  const detail = useCrudDetail<Video>(VIDEOS_RESOURCE, id);

  if (isEdit) {
    if (detail.isLoading) return <FormSkeleton title="Edit video" />;
    if (detail.isError) {
      return (
        <div className="space-y-6">
          <PageHeader title="Edit video" breadcrumbs={crumbs({ label: 'Edit' })} />
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        </div>
      );
    }
  }

  const video = detail.data;

  return (
    <Can
      permission={isEdit ? CONTENT_PERMS.update : CONTENT_PERMS.create}
      fallback={
        <div className="space-y-6">
          <PageHeader title={isEdit ? 'Edit video' : 'New video'} />
          <ForbiddenState />
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title={isEdit ? `Edit: ${video?.title_en ?? ''}` : 'New video'}
          description={isEdit ? 'Update this video. The slug stays permanent.' : 'Add a YouTube video to the library.'}
          breadcrumbs={crumbs({ label: isEdit ? 'Edit' : 'New' })}
        />
        <Card>
          <CardContent>
            <VideoForm video={isEdit ? video : undefined} />
          </CardContent>
        </Card>
        {isEdit && video ? (
          <p className="text-sm text-muted-foreground">
            <Link href={`${ROUTES.videos}/${video.id}`} className="text-primary hover:underline">
              ← Back to video
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
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
