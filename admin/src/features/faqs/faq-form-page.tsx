'use client';

/**
 * FAQ create/edit page. On the edit route it loads the detail first and shows a
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
import { FAQS_RESOURCE, FAQ_PERMS } from './api';
import type { FaqDetail } from './types';
import { FaqForm } from './components/faq-form';

const crumbs = (extra: { label: string }) => [{ label: 'FAQs', href: ROUTES.faqs }, { label: extra.label }];

export function FaqFormPage({ id }: { id?: string }) {
  const isEdit = Boolean(id);
  const detail = useCrudDetail<FaqDetail>(FAQS_RESOURCE, id);

  if (isEdit) {
    if (detail.isLoading) return <FormSkeleton title="Edit FAQ" />;
    if (detail.isError) {
      return (
        <div className="space-y-6">
          <PageHeader title="Edit FAQ" breadcrumbs={crumbs({ label: 'Edit' })} />
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        </div>
      );
    }
  }

  const faq = detail.data;

  return (
    <Can
      permission={isEdit ? FAQ_PERMS.update : FAQ_PERMS.create}
      fallback={
        <div className="space-y-6">
          <PageHeader title={isEdit ? 'Edit FAQ' : 'New FAQ'} />
          <ForbiddenState />
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title={isEdit ? `Edit: ${faq?.question_en ?? ''}` : 'New FAQ'}
          description={isEdit ? 'Update this FAQ.' : 'Create a frequently asked question.'}
          breadcrumbs={crumbs({ label: isEdit ? 'Edit' : 'New' })}
        />
        <Card>
          <CardContent>
            <FaqForm faq={isEdit ? faq : undefined} />
          </CardContent>
        </Card>
        {isEdit && faq ? (
          <p className="text-sm text-muted-foreground">
            <Link href={`${ROUTES.faqs}/${faq.id}`} className="text-primary hover:underline">
              ← Back to FAQ
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
