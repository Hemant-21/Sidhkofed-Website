'use client';

/**
<<<<<<< HEAD
 * Membership create/edit page. On edit it loads the detail first (skeleton/error/forbidden states);
 * on create it renders the empty form.
=======
 * Membership create/edit page. On the edit route it loads the detail first and shows a
 * skeleton/error/forbidden state. On the create route it renders the empty form. Permission-aware
 * via <Can> (the backend enforces RBAC).
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
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

<<<<<<< HEAD
const crumbs = (label: string) => [{ label: 'Memberships', href: ROUTES.memberships }, { label }];
=======
const crumbs = (extra: { label: string }) => [
  { label: 'Institutional Membership', href: ROUTES.memberships },
  { label: extra.label },
];
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3

export function MembershipFormPage({ id }: { id?: string }) {
  const isEdit = Boolean(id);
  const detail = useCrudDetail<MembershipDetail>(MEMBERSHIPS_RESOURCE, id);

  if (isEdit) {
    if (detail.isLoading) return <FormSkeleton title="Edit membership" />;
    if (detail.isError) {
      return (
        <div className="space-y-6">
<<<<<<< HEAD
          <PageHeader title="Edit membership" breadcrumbs={crumbs('Edit')} />
=======
          <PageHeader title="Edit membership" breadcrumbs={crumbs({ label: 'Edit' })} />
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        </div>
      );
    }
  }

  const membership = detail.data;
<<<<<<< HEAD
=======
  const title = isEdit ? membership?.institution?.name_en ?? '' : '';
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3

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
<<<<<<< HEAD
          title={isEdit ? `Edit: ${membership?.institution?.name_en ?? ''}` : 'New membership'}
          description={isEdit ? 'Update this membership.' : 'Create an institutional membership record.'}
          breadcrumbs={crumbs(isEdit ? 'Edit' : 'New')}
=======
          title={isEdit ? `Edit: ${title}` : 'New membership'}
          description={
            isEdit
              ? 'Update this membership. The slug stays permanent.'
              : 'Record an institution-wise membership (SIDHKOFED / District Union × Primary / Nominal).'
          }
          breadcrumbs={crumbs({ label: isEdit ? 'Edit' : 'New' })}
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
        />
        <Card>
          <CardContent>
            <MembershipForm membership={isEdit ? membership : undefined} />
          </CardContent>
        </Card>
        {isEdit && membership ? (
          <p className="text-sm text-muted-foreground">
<<<<<<< HEAD
            <Link href={`${ROUTES.memberships}/${membership.id}`} className="text-primary hover:underline">
=======
            <Link
              href={`${ROUTES.memberships}/${membership.id}`}
              className="text-primary hover:underline"
            >
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
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
