'use client';

<<<<<<< HEAD
/**
 * User create/edit page. On edit it loads the user first (skeleton/error states); on create it
 * renders the empty form. Super Admin only — gated via role with a forbidden fallback.
 */

import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/layout/card';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { ForbiddenState } from '@/components/feedback/forbidden-state';
import { useCrudDetail } from '@/hooks/crud';
import { usePermissions } from '@/hooks/use-permissions';
import { ROUTES } from '@/constants/routes';
import { ROLE_KEYS } from '@/constants/permissions';
import { USERS_RESOURCE } from './api';
import type { User } from './types';
import { UserForm } from './components/user-form';

const crumbs = (label: string) => [{ label: 'Users', href: ROUTES.users }, { label }];

export function UserFormPage({ id }: { id?: string }) {
  const isEdit = Boolean(id);
  const { hasRole } = usePermissions();
  const detail = useCrudDetail<User>(USERS_RESOURCE, id);

  if (!hasRole(ROLE_KEYS.superAdmin)) {
    return (
      <div className="space-y-6">
        <PageHeader title={isEdit ? 'Edit user' : 'New user'} />
        <ForbiddenState />
=======
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { ForbiddenState } from '@/components/feedback/forbidden-state';
import { ErrorState } from '@/components/feedback/error-state';
import { Skeleton } from '@/components/feedback/skeleton';
import { usePermissions } from '@/hooks/use-permissions';
import { ROLE_KEYS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { useCreateUser, useUpdateUser, useUserDetail } from './hooks';
import { UserForm } from './components/user-form';
import type { CreateUserPayload, UpdateUserPayload } from './types';

interface Props {
  /** Present when editing an existing user. Absent for create flow. */
  id?: string;
}

export function UserFormPage({ id }: Props) {
  const router = useRouter();
  const { hasRole } = usePermissions();
  const isSuperAdmin = hasRole(ROLE_KEYS.superAdmin);
  const isEdit = Boolean(id);

  const detail = useUserDetail(id, isSuperAdmin && isEdit);
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser(id ?? '');

  const crumbs = [
    { label: 'Users', href: ROUTES.users },
    { label: isEdit ? (detail.data?.full_name ?? 'Edit user') : 'New user' },
  ];

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={isEdit ? 'Edit user' : 'New user'}
          breadcrumbs={crumbs}
        />
        <ForbiddenState
          title="Restricted to Super Admin"
          description="User management is available to Super Administrators only."
        />
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
      </div>
    );
  }

  if (isEdit && detail.isLoading) {
    return (
      <div className="space-y-6">
<<<<<<< HEAD
        <PageHeader title="Edit user" breadcrumbs={crumbs('Edit')} />
        <Card>
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
=======
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-96 w-full" />
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
      </div>
    );
  }

<<<<<<< HEAD
  if (isEdit && detail.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit user" breadcrumbs={crumbs('Edit')} />
=======
  if (isEdit && (detail.isError || !detail.data)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit user" breadcrumbs={crumbs} />
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

<<<<<<< HEAD
  const user = detail.data;
=======
  const handleSubmit = (payload: CreateUserPayload | UpdateUserPayload) => {
    if (isEdit && id) {
      updateMutation.mutate(payload as UpdateUserPayload, {
        onSuccess: (updated) => {
          router.push(`${ROUTES.users}/${updated.id}`);
        },
      });
    } else {
      createMutation.mutate(payload as CreateUserPayload, {
        onSuccess: (created) => {
          router.push(`${ROUTES.users}/${created.id}`);
        },
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3

  return (
    <div className="space-y-6">
      <PageHeader
<<<<<<< HEAD
        title={isEdit ? `Edit: ${user?.full_name ?? ''}` : 'New user'}
        description={isEdit ? 'Update this administrator account.' : 'Create an administrator account.'}
        breadcrumbs={crumbs(isEdit ? 'Edit' : 'New')}
      />
      <Card>
        <CardContent>
          <UserForm user={isEdit ? user : undefined} />
        </CardContent>
      </Card>
=======
        title={isEdit ? `Edit ${detail.data?.full_name ?? 'user'}` : 'New user'}
        description={isEdit ? 'Update account details, roles, and access.' : 'Create a new CMS user account.'}
        breadcrumbs={crumbs}
      />
      <div className="max-w-2xl">
        <UserForm
          user={isEdit ? detail.data : undefined}
          onSubmit={handleSubmit}
          isPending={isPending}
        />
      </div>
>>>>>>> d476bcebf175f0a60e2572959456e7339f1461f3
    </div>
  );
}
