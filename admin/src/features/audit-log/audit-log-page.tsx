'use client';

/**
 * Audit Log page (Administration; Super Admin only). Read-only, server-driven list of audit entries
 * with action/module filtering and a detail drawer. Composes the shared DataTable + filter
 * framework + pagination; no mutations exist for this resource.
 */

import { useMemo, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/layout/card';
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DataTable, useDataTable } from '@/components/data-table';
import { EmptyState } from '@/components/feedback/empty-state';
import { ForbiddenState } from '@/components/feedback/forbidden-state';
import { Pagination } from '@/components/ui/pagination';
import { useCrudList, useFilters } from '@/hooks/crud';
import { usePermissions } from '@/hooks/use-permissions';
import { formatDateTime } from '@/utils/date';
import { ROLE_KEYS } from '@/constants/permissions';
import { AUDIT_RESOURCE } from './api';
import { AUDIT_ACTIONS, type AuditLog } from './types';
import { auditColumns } from './components/audit-columns';

const AUDIT_FILTER_KEYS = ['action', 'module'];
const ACTION_OPTIONS = [{ value: '', label: 'All actions' }, ...AUDIT_ACTIONS.map((a) => ({ value: a, label: a }))];

export function AuditLogPage() {
  const { hasRole } = usePermissions();
  const filters = useFilters({ keys: AUDIT_FILTER_KEYS });
  const table = useDataTable();
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const query = useMemo(
    () => ({ ...filters.query, page: filters.page, ordering: table.ordering ?? filters.query.ordering }),
    [filters.query, filters.page, table.ordering],
  );
  const list = useCrudList<AuditLog>(AUDIT_RESOURCE, query);
  const columns = useMemo(() => auditColumns(setSelected), []);

  if (!hasRole(ROLE_KEYS.superAdmin)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Audit Log" />
        <ForbiddenState />
      </div>
    );
  }

  const rows = list.data?.items ?? [];
  const pagination = list.data?.pagination;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Immutable record of every administrative action. Read-only; Super Admin access."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="audit-filter-action">Action</Label>
          <Select
            id="audit-filter-action"
            value={filters.filters.action ?? ''}
            onChange={(e) => filters.setFilter('action', e.target.value || undefined)}
            options={ACTION_OPTIONS}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="audit-filter-module">Module</Label>
          <SearchInput
            value={filters.filters.module ?? ''}
            onValueChange={(v) => filters.setFilter('module', v || undefined)}
            placeholder="Filter by module (e.g. users, settings, events)…"
          />
        </div>
      </div>

      {filters.isActive ? (
        <Button variant="ghost" size="sm" onClick={filters.reset}>
          Clear filters
        </Button>
      ) : null}

      <Card className="p-0">
        <DataTable<AuditLog>
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
          onRowClick={setSelected}
          onRetry={() => void list.refetch()}
          emptyState={
            <EmptyState
              icon={ScrollText}
              title={filters.isActive ? 'No entries match your filters' : 'No audit entries'}
              description={
                filters.isActive ? 'Try adjusting or clearing the filters.' : 'Administrative actions will appear here.'
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

      <Dialog open={selected !== null} onClose={() => setSelected(null)} title="Audit entry">
        {selected ? <AuditDetail entry={selected} /> : null}
      </Dialog>
    </div>
  );
}

function AuditDetail({ entry }: { entry: AuditLog }) {
  return (
    <dl className="grid grid-cols-3 gap-x-4 gap-y-3 text-sm">
      <Row label="When">{formatDateTime(entry.created_at)}</Row>
      <Row label="Action">
        <Badge tone="info">{entry.event ?? entry.action}</Badge>
      </Row>
      <Row label="Module">{entry.module}</Row>
      <Row label="User">{entry.user ? `${entry.user.full_name} (${entry.user.email})` : 'System'}</Row>
      <Row label="Record">{entry.record_id ?? '—'}</Row>
      <Row label="State">
        {entry.previous_state || entry.new_state ? `${entry.previous_state ?? '—'} → ${entry.new_state ?? '—'}` : '—'}
      </Row>
      <Row label="Summary">{entry.change_summary ?? '—'}</Row>
      <div className="col-span-3">
        <dt className="mb-1 font-medium text-muted-foreground">Metadata</dt>
        <dd>
          <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(entry.metadata ?? {}, null, 2)}
          </pre>
        </dd>
      </div>
    </dl>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="col-span-3 grid grid-cols-3 gap-4 sm:col-span-1 sm:block">
      <dt className="font-medium text-muted-foreground sm:mb-1">{label}</dt>
      <dd className="col-span-2 break-words text-foreground sm:col-span-1">{children}</dd>
    </div>
  );
}
