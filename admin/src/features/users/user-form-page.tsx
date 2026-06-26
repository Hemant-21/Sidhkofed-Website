'use client';

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
      </div>
    );
  }

  if (isEdit && detail.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isEdit && (detail.isError || !detail.data)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit user" breadcrumbs={crumbs} />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      <PageHeader
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
    </div>
  );
}
