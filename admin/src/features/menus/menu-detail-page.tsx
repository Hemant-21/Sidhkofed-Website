'use client';

/**
 * Menu item detail / view page. Read-only presentation of one navigation item plus edit/delete
 * affordances. Internal-page links resolve to the page route; explicit url links open as given.
 */

import Link from 'next/link';
import { Pencil, Trash2, ExternalLink, FileText, Link2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/components/layout/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/feedback/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { Can } from '@/components/auth';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { ROUTES } from '@/constants/routes';
import { MENU_LOCATION_LABEL } from './types';
import { MENU_DELETE_ROLES, MENU_PERMS } from './permissions';
import { useMenuItem, useDeleteMenuItem } from './hooks';

export function MenuDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const detail = useMenuItem(id);
  const remove = useDeleteMenuItem();
  const confirm = useConfirmDialog();
  const item = detail.data;

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError || !item) {
    return (
      <div className="space-y-6">
        <PageHeader title="Menu item" breadcrumbs={[{ label: 'Menus', href: ROUTES.menus }, { label: 'Detail' }]} />
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }

  const onDelete = async () => {
    const ok = await confirm.confirmDelete(
      `the menu item “${item.label_en}”`,
      'Deleting this item also removes any child items beneath it. This cannot be undone.',
    );
    if (ok) {
      await remove.mutateAsync(item.id);
      router.push(ROUTES.menus);
    }
  };

  const destination = item.page ? `/pages/${item.page.slug}` : (item.url ?? '—');

  return (
    <div className="space-y-6">
      <PageHeader
        title={item.label_en}
        description={item.label_hi ?? undefined}
        breadcrumbs={[{ label: 'Menus', href: ROUTES.menus }, { label: item.label_en }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Can permission={MENU_PERMS.update}>
              <Button asChild variant="outline" size="sm">
                <Link href={`${ROUTES.menus}/${item.id}/edit`}>
                  <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                </Link>
              </Button>
            </Can>
            <Can role={MENU_DELETE_ROLES}>
              <Button
                variant="outline"
                size="sm"
                isLoading={remove.isPending}
                onClick={() => void onDelete()}
              >
                <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" /> Delete
              </Button>
            </Can>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="default">{MENU_LOCATION_LABEL[item.location]}</Badge>
        {item.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="muted">Inactive</Badge>}
        {item.opens_new_tab ? <Badge tone="info">Opens in new tab</Badge> : null}
      </div>

      <Card>
        <CardHeader title="Destination" />
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Item label="Link type">
              <span className="inline-flex items-center gap-1.5">
                {item.page ? (
                  <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <Link2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                )}
                {item.page ? 'Internal page' : 'URL / internal path'}
              </span>
            </Item>
            <Item label="Destination">
              {item.url && /^https?:\/\//i.test(item.url) ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 break-all text-primary hover:underline"
                >
                  {item.url} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ) : (
                <code className="break-all text-foreground">{destination}</code>
              )}
            </Item>
            <Item label="Parent">{item.parent_id ? 'Nested item' : 'Top level'}</Item>
            <Item label="Display order">{item.display_order}</Item>
            {item.page ? <Item label="Linked page">{item.page.title_en}</Item> : null}
          </dl>
        </CardContent>
      </Card>
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
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
