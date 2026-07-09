'use client';

/**
 * Enquiry list page (Engagement & Data; Publisher + Super Admin only — enquiries.routes.ts uses a
 * role guard rather than a permission grant, so gating here checks the same roles directly; see
 * permissions.ts). Composes the shared DataTable + filter framework + pagination, exactly like
 * every other admin module. There is no create affordance: enquiries only arrive through the
 * public submission form. The admin surface reads, filters, annotates, archives, and exports.
 */
import { useMemo, useState } from 'react';
import { Download, Inbox } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/layout/card';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { DataTable, ColumnVisibility, useDataTable } from '@/components/data-table';
import { EmptyState } from '@/components/feedback/empty-state';
import { ForbiddenState } from '@/components/feedback/forbidden-state';
import { useCrudList, useFilters } from '@/hooks/crud';
import { usePermissions } from '@/hooks/use-permissions';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/api/server-errors';
import { ENQUIRIES_RESOURCE, ENQUIRY_ROLES, exportEnquiries } from './api';
import type { EnquirySummary } from './types';
import { EnquiryFilters, ENQUIRY_FILTER_KEYS } from './components/enquiry-filters';
import { enquiryColumns } from './components/enquiry-columns';

export function EnquiryListPage() {
  const { hasRole } = usePermissions();
  const allowed = hasRole(ENQUIRY_ROLES);
  const toast = useToast();
  const [exporting, setExporting] = useState(false);

  const filters = useFilters({ keys: ENQUIRY_FILTER_KEYS });
  const table = useDataTable({ initialSort: { field: 'submitted_at', direction: 'desc' } });

  const query = useMemo(
    () => ({ ...filters.query, page: filters.page, ordering: table.ordering ?? '-submitted_at' }),
    [filters.query, filters.page, table.ordering],
  );

  const list = useCrudList<EnquirySummary>(ENQUIRIES_RESOURCE, query, { enabled: allowed });
  const columns = useMemo(() => enquiryColumns(), []);
  const rows = list.data?.items ?? [];
  const pagination = list.data?.pagination;

  if (!allowed) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Enquiries"
          description="Public contact-form enquiries submitted through the SIDHKOFED website."
        />
        <ForbiddenState
          title="Restricted to Publisher / Super Admin"
          description="Public enquiries are managed by Publishers and Super Administrators only."
        />
      </div>
    );
  }

  const onExport = async () => {
    setExporting(true);
    try {
      await exportEnquiries(filters.query);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enquiries"
        description="Public contact-form enquiries submitted through the SIDHKOFED website."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void onExport()}
            isLoading={exporting}
            leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}
          >
            Export XLSX
          </Button>
        }
      />

      <Card className="space-y-4 p-4">
        <EnquiryFilters filters={filters} />
        <div className="flex justify-end">
          <ColumnVisibility columns={columns} hidden={table.hiddenColumns} onChange={table.setHiddenColumns} />
        </div>
      </Card>

      <Card className="p-0">
        <DataTable
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
          hiddenColumns={table.hiddenColumns}
          onRetry={() => void list.refetch()}
          emptyState={
            <EmptyState
              icon={Inbox}
              title={filters.isActive ? 'No enquiries match your filters' : 'No enquiries yet'}
              description={
                filters.isActive
                  ? 'Try adjusting or clearing the filters.'
                  : 'Public enquiries submitted through the website will appear here.'
              }
              action={
                filters.isActive ? (
                  <Button variant="outline" size="sm" onClick={filters.reset}>
                    Clear filters
                  </Button>
                ) : undefined
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
