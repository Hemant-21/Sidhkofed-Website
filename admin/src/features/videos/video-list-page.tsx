'use client';

/**
 * Videos list page. Composes the shared DataTable + filter framework + pagination + bulk actions
 * against the `videos` resource. Server pagination/search/filters; loading/empty/error states from
 * shared infrastructure. Bulk publish/archive reuse the lifecycle hooks and are permission-gated.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { Plus, Video as VideoIcon } from 'lucide-react';
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
import { ROUTES } from '@/constants/routes';
import { VIDEOS_RESOURCE, CONTENT_PERMS } from './api';
import type { Video } from './types';
import { videoColumns } from './components/video-columns';
import { VideoFilters, VIDEO_FILTER_KEYS } from './components/video-filters';

export function VideoListPage() {
  const filters = useFilters({ keys: VIDEO_FILTER_KEYS });
  const table = useDataTable();
  const confirm = useConfirmDialog();

  const query = useMemo(() => ({ ...filters.query, page: filters.page }), [filters.query, filters.page]);

  const list = useCrudList<Video>(VIDEOS_RESOURCE, query);
  const publish = usePublish<Video>(VIDEOS_RESOURCE, { toastOnSuccess: false });
  const archive = useArchive<Video>(VIDEOS_RESOURCE, { toastOnSuccess: false });
  const bulkPublish = useBulkAction({ verb: 'Published' });
  const bulkArchive = useBulkAction({ verb: 'Archived' });

  const columns = useMemo(
    () =>
      videoColumns((row) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`${ROUTES.videos}/${row.id}`}>View</Link>
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
        title="Videos"
        description="YouTube videos linked across the site. Up to three may be featured on the homepage."
        actions={
          <Can permission={CONTENT_PERMS.create}>
            <Button asChild leftIcon={<Plus className="h-4 w-4" />}>
              <Link href={`${ROUTES.videos}/new`}>New video</Link>
            </Button>
          </Can>
        }
      />

      <VideoFilters filters={filters} />

      <Toolbar end={<ColumnVisibility columns={columns} hidden={table.hiddenColumns} onChange={table.setHiddenColumns} />} />

      {selected.length > 0 ? (
        <BulkActions count={selected.length} onClear={table.clearSelection}>
          <Can permission={CONTENT_PERMS.publish}>
            <Button
              size="sm"
              variant="outline"
              isLoading={bulkPublish.isRunning}
              onClick={async () => {
                if (await confirm.confirmPublish(`${selected.length} video(s)`)) {
                  await bulkPublish.run(selected, (id) => publish.mutateAsync(id));
                  table.clearSelection();
                }
              }}
            >
              Publish
            </Button>
          </Can>
          <Can permission={CONTENT_PERMS.archive}>
            <Button
              size="sm"
              variant="outline"
              isLoading={bulkArchive.isRunning}
              onClick={async () => {
                if (await confirm.confirmArchive(`${selected.length} video(s)`)) {
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
        <DataTable<Video>
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
          selectable
          selectedRowIds={selected}
          onSelectionChange={table.setSelectedRowIds}
          hiddenColumns={table.hiddenColumns}
          onRetry={() => void list.refetch()}
          emptyState={
            <EmptyState
              icon={VideoIcon}
              title={filters.isActive ? 'No videos match your filters' : 'No videos yet'}
              description={filters.isActive ? 'Try adjusting or clearing the filters.' : 'Add the first YouTube video to get started.'}
              action={
                filters.isActive ? (
                  <Button variant="outline" size="sm" onClick={filters.reset}>
                    Clear filters
                  </Button>
                ) : (
                  <Can permission={CONTENT_PERMS.create}>
                    <Button asChild size="sm">
                      <Link href={`${ROUTES.videos}/new`}>New video</Link>
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
