'use client';

/**
 * Membership create/edit page. On edit it loads the detail first (skeleton/error/forbidden states);
 * on create it renders the empty form.
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
import { MEMBERSHIPS_RESOURCE, MEMBERSHIP_PERMS } from './api';
import type { MembershipDetail } from './types';
import { MembershipForm } from './components/membership-form';

const crumbs = (label: string) => [{ label: 'Memberships', href: ROUTES.memberships }, { label }];

export function MembershipFormPage({ id }: { id?: string }) {
  const isEdit = Boolean(id);
  const detail = useCrudDetail<MembershipDetail>(MEMBERSHIPS_RESOURCE, id);

  if (isEdit) {
    if (detail.isLoading) return <FormSkeleton title="Edit membership" />;
    if (detail.isError) {
      return (
        <div className="space-y-6">
          <PageHeader title="Edit membership" breadcrumbs={crumbs('Edit')} />
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        </div>
      );
    }
  }

  const membership = detail.data;

  return (
    <Can
      permission={isEdit ? MEMBERSHIP_PERMS.update : MEMBERSHIP_PERMS.create}
      fallback={
        <div className="space-y-6">
          <PageHeader title={isEdit ? 'Edit membership' : 'New membership'} />
          <ForbiddenState />
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title={isEdit ? `Edit: ${membership?.institution?.name_en ?? ''}` : 'New membership'}
          description={isEdit ? 'Update this membership.' : 'Create an institutional membership record.'}
          breadcrumbs={crumbs(isEdit ? 'Edit' : 'New')}
        />
        <Card>
          <CardContent>
            <MembershipForm membership={isEdit ? membership : undefined} />
          </CardContent>
        </Card>
        {isEdit && membership ? (
          <p className="text-sm text-muted-foreground">
            <Link href={`${ROUTES.memberships}/${membership.id}`} className="text-primary hover:underline">
              ← Back to membership
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
