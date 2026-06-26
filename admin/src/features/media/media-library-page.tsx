'use client';

/**
 * Media Library page. Reusable, fully API-driven media management: server-filtered grid OR list,
 * selection + bulk archive, upload (single/bulk with progress/retry/cancel), and a rich preview
 * dialog (metadata edit, replace, usages, archive/restore). Media is server-paginated (no client
 * filtering); media is role-managed (all CMS roles) so affordances gate on role.
 */

import { useMemo, useState } from 'react';
import { ImageOff, LayoutGrid, List, UploadCloud } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Toolbar } from '@/components/layout/toolbar';
import { Card } from '@/components/layout/card';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { DataTable, BulkActions, useDataTable } from '@/components/data-table';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { Skeleton } from '@/components/feedback/skeleton';
import { Can } from '@/components/auth';
import { useFilters, useCrudList, useArchive, useBulkAction } from '@/hooks/crud';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { cn } from '@/utils/cn';
import { MEDIA_RESOURCE, MEDIA_ROLES } from './api';
import type { MediaAsset } from './types';
import { MediaFilters, MEDIA_FILTER_KEYS } from './components/media-filters';
import { MediaGrid } from './components/media-grid';
import { mediaColumns } from './components/media-columns';
import { MediaUploadDialog } from './components/media-upload-dialog';
import { MediaPreviewDialog } from './components/media-preview-dialog';

type View = 'grid' | 'list';

export function MediaLibraryPage() {
  const filters = useFilters({ keys: MEDIA_FILTER_KEYS });
  const table = useDataTable();
  const confirm = useConfirmDialog();
  const [view, setView] = useState<View>('grid');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<MediaAsset | null>(null);

  const query = useMemo(() => ({ ...filters.query, page: filters.page }), [filters.query, filters.page]);
  const list = useCrudList<MediaAsset>(MEDIA_RESOURCE, query);
  const archive = useArchive<MediaAsset>(MEDIA_RESOURCE, { toastOnSuccess: false });
  const bulkArchive = useBulkAction({ verb: 'Archived' });

  const rows = list.data?.items ?? [];
  const pagination = list.data?.pagination;
  const selected = table.selectedRowIds;

  const toggleSelect = (id: string) =>
    table.setSelectedRowIds(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  const columns = useMemo(
    () =>
      mediaColumns((row) => (
        <Button variant="ghost" size="sm" onClick={() => setPreview(row)}>
          Preview
        </Button>
      )),
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media Library"
        description="One reusable library for images, logos, icons, and documents — upload once, link everywhere."
        actions={
          <Can role={MEDIA_ROLES}>
            <Button leftIcon={<UploadCloud className="h-4 w-4" />} onClick={() => setUploadOpen(true)}>
              Upload media
            </Button>
          </Can>
        }
      />

      <MediaFilters filters={filters} />

      <Toolbar
        end={
          <div className="inline-flex overflow-hidden rounded-md border border-border" role="group" aria-label="View mode">
            <ViewToggle active={view === 'grid'} onClick={() => setView('grid')} label="Grid view" icon={<LayoutGrid className="h-4 w-4" />} />
            <ViewToggle active={view === 'list'} onClick={() => setView('list')} label="List view" icon={<List className="h-4 w-4" />} />
          </div>
        }
      />

      {selected.length > 0 ? (
        <BulkActions count={selected.length} onClear={table.clearSelection}>
          <Can role={MEDIA_ROLES}>
            <Button
              size="sm"
              variant="outline"
              isLoading={bulkArchive.isRunning}
              onClick={async () => {
                if (await confirm.confirmArchive(`${selected.length} media asset(s)`)) {
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

      {view === 'grid' ? (
        <GridView
          rows={rows}
          isLoading={list.isLoading}
          isError={list.isError}
          error={list.error}
          isFiltered={filters.isActive}
          onRetry={() => void list.refetch()}
          selectedIds={selected}
          onToggleSelect={toggleSelect}
          onOpen={setPreview}
          onUpload={() => setUploadOpen(true)}
        />
      ) : (
        <Card className="p-0">
          <DataTable<MediaAsset>
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
            onRetry={() => void list.refetch()}
            emptyState={<MediaEmpty isFiltered={filters.isActive} onUpload={() => setUploadOpen(true)} onClear={filters.reset} />}
          />
        </Card>
      )}

      {pagination ? (
        <Pagination
          page={pagination.page}
          pageSize={pagination.page_size}
          totalItems={pagination.total_items}
          totalPages={pagination.total_pages}
          onPageChange={filters.setPage}
        />
      ) : null}

      <MediaUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <MediaPreviewDialog asset={preview} open={preview !== null} onClose={() => setPreview(null)} />
    </div>
  );
}

function GridView({
  rows,
  isLoading,
  isError,
  error,
  isFiltered,
  onRetry,
  selectedIds,
  onToggleSelect,
  onOpen,
  onUpload,
}: {
  rows: MediaAsset[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isFiltered: boolean;
  onRetry: () => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onOpen: (asset: MediaAsset) => void;
  onUpload: () => void;
}) {
  if (isError) {
    return (
      <Card>
        <ErrorState error={error} onRetry={onRetry} />
      </Card>
    );
  }
  if (isLoading) {
    return (
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <li key={i}>
            <Skeleton className="aspect-video w-full rounded-lg" />
          </li>
        ))}
      </ul>
    );
  }
  if (rows.length === 0) {
    return (
      <Card>
        <MediaEmpty isFiltered={isFiltered} onUpload={onUpload} />
      </Card>
    );
  }
  return <MediaGrid assets={rows} selectable selectedIds={selectedIds} onToggleSelect={onToggleSelect} onOpen={onOpen} />;
}

function MediaEmpty({ isFiltered, onUpload, onClear }: { isFiltered: boolean; onUpload: () => void; onClear?: () => void }) {
  return (
    <EmptyState
      icon={ImageOff}
      title={isFiltered ? 'No media matches your filters' : 'No media yet'}
      description={isFiltered ? 'Try adjusting or clearing the filters.' : 'Upload images or documents to build the shared library.'}
      action={
        isFiltered && onClear ? (
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        ) : (
          <Can role={MEDIA_ROLES}>
            <Button size="sm" onClick={onUpload}>
              Upload media
            </Button>
          </Can>
        )
      }
    />
  );
}

function ViewToggle({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        'flex h-9 w-9 items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
      )}
    >
      {icon}
    </button>
  );
}
