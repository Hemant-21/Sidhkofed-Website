'use client';

/**
 * Galleries list page. Composes the shared DataTable + filter framework + pagination + bulk actions.
 * Server pagination, server search, server filters, column selection, and loading/empty/error states
 * from shared infrastructure. The gallery list is not server-sortable (no backend ordering allow-list),
 * so columns are not sortable. No client-side filtering.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { Plus, Images } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Toolbar } from '@/components/layout/toolbar';
import { Card } from '@/components/layout/card';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { DataTable, ColumnVisibility, BulkActions, useDataTable } from '@/components/data-table';
import { EmptyState } from '@/components/feedback/empty-state';
import { Can } from '@/components/auth';
import { useFilters, useCrudList, useArchive, usePublish, useBulkAction } from '@/hooks/crud';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { Alert } from '@/components/ui/alert';
import { ROUTES } from '@/constants/routes';
import { GALLERIES_RESOURCE, GALLERY_PERMS } from './api';
import type { GallerySummary } from './types';
import { galleryColumns } from './components/gallery-columns';
import { GalleryFilters, GALLERY_FILTER_KEYS } from './components/gallery-filters';

export function GalleryListPage() {
  const filters = useFilters({ keys: GALLERY_FILTER_KEYS });
  const table = useDataTable();
  const confirm = useConfirmDialog();

  const query = useMemo(
    () => ({ ...filters.query, page: filters.page }),
    [filters.query, filters.page],
  );

  const list = useCrudList<GallerySummary>(GALLERIES_RESOURCE, query);
  const publish = usePublish<GallerySummary>(GALLERIES_RESOURCE, { toastOnSuccess: false });
  const archive = useArchive<GallerySummary>(GALLERIES_RESOURCE, { toastOnSuccess: false });
  const bulkPublish = useBulkAction({ verb: 'Published' });
  const bulkArchive = useBulkAction({ verb: 'Archived' });

  const columns = useMemo(
    () =>
      galleryColumns((row) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`${ROUTES.galleries}/${row.id}`}>View</Link>
        </Button>
      )),
    [],
  );

  const rows = list.data?.items ?? [];
  const pagination = list.data?.pagination;
  const selected = table.selectedRowIds;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Galleries"
        description="Photo galleries that reference reusable Media Library images. Manage images from a gallery's detail page."
        actions={
          <Can permission={GALLERY_PERMS.create}>
            <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
              <Link href={`${ROUTES.galleries}/new`}>New gallery</Link>
            </Button>
          </Can>
        }
      />

      <Alert tone="info" title="Homepage hero carousel">
        The public website homepage displays a CMS-powered image carousel when a gallery with the
        exact slug <strong>hero-slides</strong> is published here. Create that gallery, add your
        field-work and community photos to it, then publish — the carousel will activate
        automatically. Until this gallery exists the homepage shows a static placeholder image.
      </Alert>

      <GalleryFilters filters={filters} />

      <Toolbar
        end={
          <ColumnVisibility
            columns={columns}
            hidden={table.hiddenColumns}
            onChange={table.setHiddenColumns}
          />
        }
      />

      {selected.length > 0 ? (
        <BulkActions count={selected.length} onClear={table.clearSelection}>
          <Can permission={GALLERY_PERMS.publish}>
            <Button
              size="sm"
              variant="outline"
              isLoading={bulkPublish.isRunning}
              onClick={async () => {
                if (await confirm.confirmPublish(`${selected.length} gallery(ies)`)) {
                  await bulkPublish.run(selected, (id) => publish.mutateAsync(id));
                  table.clearSelection();
                }
              }}
            >
              Publish
            </Button>
          </Can>
          <Can permission={GALLERY_PERMS.archive}>
            <Button
              size="sm"
              variant="outline"
              isLoading={bulkArchive.isRunning}
              onClick={async () => {
                if (await confirm.confirmArchive(`${selected.length} gallery(ies)`)) {
                  await bulkArchive.run(selected, (id) => archive.mutateAsync(id));
                  table.clearSelection();
                }
              }}
            >
              Archive
            </Button>
          </Can>
        </BulkActions>
      ) : null}

      <Card className="p-0">
        <DataTable<GallerySummary>
          columns={columns}
          data={{
            rows,
            totalItems: pagination?.total_items ?? 0,
            totalPages: pagination?.total_pages ?? 0,
            isLoading: list.isLoading,
            isError: list.isError,
            error: list.error,
          }}
          getRowId={(row) => row.id}
          sort={table.sort}
          onSortChange={table.onSortChange}
          selectable
          selectedRowIds={selected}
          onSelectionChange={table.setSelectedRowIds}
          hiddenColumns={table.hiddenColumns}
          onRetry={() => void list.refetch()}
          emptyState={
            <EmptyState
              icon={Images}
              title={filters.isActive ? 'No galleries match your filters' : 'No galleries yet'}
              description={
                filters.isActive
                  ? 'Try adjusting or clearing the filters.'
                  : 'Create the first photo gallery to get started.'
              }
              action={
                filters.isActive ? (
                  <Button variant="outline" size="sm" onClick={filters.reset}>
                    Clear filters
                  </Button>
                ) : (
                  <Can permission={GALLERY_PERMS.create}>
                    <Button asChild size="sm">
                      <Link href={`${ROUTES.galleries}/new`}>New gallery</Link>
                    </Button>
                  </Can>
                )
              }
            />
          }
        />
      </Card>

      {pagination ? (
        <Pagination
          page={pagination.page}
          pageSize={pagination.page_size}
          totalItems={pagination.total_items}
          totalPages={pagination.total_pages}
          onPageChange={filters.setPage}
        />
      ) : null}
    </div>
  );
}
