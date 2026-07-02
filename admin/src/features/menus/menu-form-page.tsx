'use client';

/**
 * Menu item create/edit page. On the edit route it loads the item first and shows a
 * skeleton/error/forbidden state. On the create route it renders the empty form, pre-selecting the
 * location passed via `?location=` (from the active menu tab).
 */

import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/layout/card';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { ForbiddenState } from '@/components/feedback/forbidden-state';
import { Can } from '@/components/auth';
import { ROUTES } from '@/constants/routes';
import { MENU_LOCATIONS, type MenuLocation } from './types';
import { MENU_PERMS } from './api';
import { useMenuItem } from './hooks';
import { MenuItemForm } from './components/menu-item-form';

const crumbs = (extra: { label: string }) => [{ label: 'Menus', href: ROUTES.menus }, { label: extra.label }];

function coerceLocation(value?: string): MenuLocation {
  return (MENU_LOCATIONS as readonly string[]).includes(value ?? '') ? (value as MenuLocation) : 'header';
}

export function MenuFormPage({ id, location }: { id?: string; location?: string }) {
  const isEdit = Boolean(id);
  const detail = useMenuItem(id);

  if (isEdit) {
    if (detail.isLoading) return <FormSkeleton title="Edit menu item" />;
    if (detail.isError) {
      return (
        <div className="space-y-6">
          <PageHeader title="Edit menu item" breadcrumbs={crumbs({ label: 'Edit' })} />
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        </div>
      );
    }
  }

  const item = detail.data;

  return (
    <Can
      permission={isEdit ? MENU_PERMS.update : MENU_PERMS.create}
      fallback={
        <div className="space-y-6">
          <PageHeader title={isEdit ? 'Edit menu item' : 'New menu item'} />
          <ForbiddenState />
        </div>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title={isEdit ? `Edit: ${item?.label_en ?? ''}` : 'New menu item'}
          description={
            isEdit ? 'Update this navigation item.' : 'Add a navigation item to a menu location.'
          }
          breadcrumbs={crumbs({ label: isEdit ? 'Edit' : 'New' })}
        />
        <Card>
          <CardContent>
            <MenuItemForm item={isEdit ? item : undefined} defaultLocation={coerceLocation(location)} />
          </CardContent>
        </Card>
        {isEdit && item ? (
          <p className="text-sm text-muted-foreground">
            <Link href={`${ROUTES.menus}/${item.id}`} className="text-primary hover:underline">
              ← Back to menu item
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
