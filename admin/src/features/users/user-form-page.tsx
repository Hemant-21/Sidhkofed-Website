'use client';

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
      </div>
    );
  }

  if (isEdit && detail.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit user" breadcrumbs={crumbs('Edit')} />
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

  if (isEdit && detail.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Edit user" breadcrumbs={crumbs('Edit')} />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  const user = detail.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? `Edit: ${user?.full_name ?? ''}` : 'New user'}
        description={isEdit ? 'Update this administrator account.' : 'Create an administrator account.'}
        breadcrumbs={crumbs(isEdit ? 'Edit' : 'New')}
      />
      <Card>
        <CardContent>
          <UserForm user={isEdit ? user : undefined} />
        </CardContent>
      </Card>
    </div>
  );
}
