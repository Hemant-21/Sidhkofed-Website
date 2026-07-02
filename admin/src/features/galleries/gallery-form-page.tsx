'use client';

/**
 * Gallery create/edit page. On the edit route it loads the detail first and shows a
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
import { GALLERIES_RESOURCE, GALLERY_PERMS } from './api';
import type { GalleryDetail } from './types';
import { GalleryForm } from './components/gallery-form';

const crumbs = (extra: { label: string }) => [
  { label: 'Galleries', href: ROUTES.galleries },
  { label: extra.label },
];

export function GalleryFormPage({ id }: { id?: string }) {
  const isEdit = Boolean(id);
  const detail = useCrudDetail<GalleryDetail>(GALLERIES_RESOURCE, id);

  if (isEdit) {
    if (detail.isLoading) return <FormSkeleton title="Edit gallery" />;
    if (detail.isError) {
      return (
        <div className="space-y-6">
          <PageHeader title="Edit gallery" breadcrumbs={crumbs({ label: 'Edit' })} />
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        </div>
      );
    }
  }

  const gallery = detail.data;

  return (
    <Can
      permission={isEdit ? GALLERY_PERMS.update : GALLERY_PERMS.create}
      fallback={
        <div className="space-y-6">
          <PageHeader title={isEdit ? 'Edit gallery' : 'New gallery'} />
          <ForbiddenState />
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title={isEdit ? `Edit: ${gallery?.title_en ?? ''}` : 'New gallery'}
          description={
            isEdit
              ? 'Update gallery details. Manage images from the gallery detail page.'
              : 'Create a photo gallery, then add images from its detail page.'
          }
          breadcrumbs={crumbs({ label: isEdit ? 'Edit' : 'New' })}
        />
        <Card>
          <CardContent>
            <GalleryForm gallery={isEdit ? gallery : undefined} />
          </CardContent>
        </Card>
        {isEdit && gallery ? (
          <p className="text-sm text-muted-foreground">
            <Link href={`${ROUTES.galleries}/${gallery.id}`} className="text-primary hover:underline">
              ← Back to gallery
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
