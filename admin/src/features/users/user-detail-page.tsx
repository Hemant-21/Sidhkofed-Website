'use client';

import Link from 'next/link';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { ForbiddenState } from '@/components/feedback/forbidden-state';
import { usePermissions } from '@/hooks/use-permissions';
import { ROLE_KEYS } from '@/constants/permissions';
import { ROUTES } from '@/constants/routes';
import { formatDateTime, formatRelative } from '@/utils/date';
import { humanize } from '@/utils/format';
import { useUserDetail } from './hooks';

export function UserDetailPage({ id }: { id: string }) {
  const { hasRole } = usePermissions();
  const isSuperAdmin = hasRole(ROLE_KEYS.superAdmin);
  const detail = useUserDetail(id, isSuperAdmin);
  const user = detail.data;

  const crumbs = [{ label: 'Users', href: ROUTES.users }, { label: user?.full_name ?? 'Detail' }];

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="User detail" breadcrumbs={crumbs} />
        <ForbiddenState
          title="Restricted to Super Admin"
          description="User management is available to Super Administrators only."
        />
      </div>
    );
  }

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError || !user) {
    return (
      <div className="space-y-6">
        <PageHeader title="User detail" breadcrumbs={crumbs} />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={user.full_name}
        description={user.email}
        breadcrumbs={crumbs}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`${ROUTES.users}/${user.id}/edit`}>
              <Pencil className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Edit
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={user.is_active ? 'success' : 'danger'}>
          {user.is_active ? 'Active' : 'Inactive'}
        </Badge>
        {user.roles.map((r) => (
          <Badge key={r} tone="default">{humanize(r)}</Badge>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Account details" />
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Item label="Full name">{user.full_name}</Item>
                <Item label="Email">{user.email}</Item>
                <Item label="Language">{user.preferred_language === 'hi' ? 'हिन्दी (Hindi)' : 'English'}</Item>
                <Item label="Status">
                  <Badge tone={user.is_active ? 'success' : 'danger'} className="text-xs">
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </Item>
                <Item label="Last login">
                  {user.last_login_at
                    ? `${formatRelative(user.last_login_at)} (${formatDateTime(user.last_login_at)})`
                    : 'Never'}
                </Item>
                <Item label="Created">{formatDateTime(user.created_at)}</Item>
                <Item label="Updated">{formatDateTime(user.updated_at)}</Item>
                <Item label="User ID">
                  <code className="break-all text-xs">{user.id}</code>
                </Item>
              </dl>
            </CardContent>
          </Card>

          {user.permissions.length > 0 ? (
            <Card>
              <CardHeader
                title="Effective permissions"
                description="All permissions granted across the user's roles."
              />
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {user.permissions.map((p) => (
                    <Badge key={p} tone="default" className="font-mono text-xs">
                      {p}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Roles" />
            <CardContent>
              {user.roles.length > 0 ? (
                <div className="space-y-2">
                  {user.roles.map((r) => (
                    <div key={r} className="flex items-center gap-2">
                      <Badge tone="default">{humanize(r)}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No roles assigned.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        <Link href={ROUTES.users} className="inline-flex items-center gap-1 text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to users
        </Link>
      </p>
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-72" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-28" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
