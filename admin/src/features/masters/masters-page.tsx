'use client';

/**
 * Masters page (Administration). A master selector drives a server-driven list of that master's
 * records with create/edit (dialog) and activate/deactivate. Reads are open to every CMS role;
 * writes/activation are gated via <Can> (Super Admin) and enforced by the backend. Reuses the
 * shared DataTable, dialog, form primitives, and pagination.
 */

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Database, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/layout/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { DataTable, useDataTable } from '@/components/data-table';
import { EmptyState } from '@/components/feedback/empty-state';
import { Can } from '@/components/auth';
import { useToast } from '@/hooks/use-toast';
import { errorMessage } from '@/lib/api/server-errors';
import type { ColumnDef } from '@/types/table';
import { PAGE_SIZE_DEFAULT } from '@/constants/app';
import {
  MASTER_PERMS,
  listMasters,
  createMaster,
  updateMaster,
  activateMaster,
  deactivateMaster,
} from './api';
import { STANDARD_MASTERS, type MasterItem } from './types';

export function MastersPage() {
  const [masterKey, setMasterKey] = useState<string>(STANDARD_MASTERS[0]?.key ?? 'event-types');
  const [page, setPage] = useState(1);
  const table = useDataTable();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<MasterItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const query = useMemo(
    () => ({ page, page_size: PAGE_SIZE_DEFAULT, ordering: table.ordering ?? 'display_order' }),
    [page, table.ordering],
  );
  const queryKey = ['master-admin', masterKey, query];
  const list = useQuery({ queryKey, queryFn: () => listMasters(masterKey, query) });

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ['master-admin', masterKey] });
    await queryClient.invalidateQueries({ queryKey: ['master', masterKey] });
  }

  async function toggleActive(row: MasterItem) {
    setBusyId(row.id);
    try {
      await (row.is_active ? deactivateMaster(masterKey, row.id) : activateMaster(masterKey, row.id));
      await invalidate();
      toast.success(row.is_active ? 'Deactivated.' : 'Activated.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const columns = useMemo<ColumnDef<MasterItem>[]>(
    () => [
      { id: 'name_en', header: 'Name', sortField: 'name_en', cell: (m) => <span className="font-medium text-foreground">{m.name_en}</span> },
      { id: 'name_hi', header: 'नाम (Hindi)', cell: (m) => <span className="text-muted-foreground">{m.name_hi ?? '—'}</span> },
      { id: 'display_order', header: 'Order', align: 'center', sortField: 'display_order', cell: (m) => <span className="text-muted-foreground">{m.display_order ?? '—'}</span> },
      { id: 'is_active', header: 'Status', align: 'center', cell: (m) => <Badge tone={m.is_active ? 'success' : 'warning'}>{m.is_active ? 'Active' : 'Inactive'}</Badge> },
      {
        id: 'actions',
        header: <span className="sr-only">Actions</span>,
        isActionColumn: true,
        align: 'right',
        cell: (m) => (
          <div className="flex justify-end gap-1">
            <Can permission={MASTER_PERMS.update}>
              <Button variant="ghost" size="sm" onClick={() => setEditing(m)}>
                Edit
              </Button>
            </Can>
            <Can anyOf={[MASTER_PERMS.activate, MASTER_PERMS.deactivate]}>
              <Button variant="ghost" size="sm" isLoading={busyId === m.id} onClick={() => void toggleActive(m)}>
                {m.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </Can>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyId, masterKey],
  );

  const rows = list.data?.items ?? [];
  const pagination = list.data?.pagination;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Masters"
        description="Reference data (dropdowns) used across the CMS. Reads are open to all roles; changes are Super Admin only."
        actions={
          <Can permission={MASTER_PERMS.create}>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
              New entry
            </Button>
          </Can>
        }
      />

      <div className="max-w-xs space-y-1">
        <Label htmlFor="master-select">Master</Label>
        <Select
          id="master-select"
          value={masterKey}
          onChange={(e) => {
            setMasterKey(e.target.value);
            setPage(1);
          }}
          options={STANDARD_MASTERS.map((m) => ({ value: m.key, label: m.label }))}
        />
      </div>

      <Card className="p-0">
        <DataTable<MasterItem>
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
          onRetry={() => void list.refetch()}
          emptyState={<EmptyState icon={Database} title="No entries" description="Add the first entry for this master." />}
        />
      </Card>

      {pagination ? (
        <Pagination
          page={pagination.page}
          pageSize={pagination.page_size}
          totalItems={pagination.total_items}
          totalPages={pagination.total_pages}
          onPageChange={setPage}
        />
      ) : null}

      <MasterFormDialog
        key={`${masterKey}:${editing?.id ?? (creating ? 'new' : 'closed')}`}
        open={creating || editing !== null}
        item={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={() => void invalidate()}
        masterKey={masterKey}
      />
    </div>
  );
}

function MasterFormDialog({
  open,
  item,
  masterKey,
  onClose,
  onSaved,
}: {
  open: boolean;
  item: MasterItem | null;
  masterKey: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isEdit = item !== null;
  // Lazy init from props; the parent remounts this dialog via `key` when the target row changes.
  const [nameEn, setNameEn] = useState(item?.name_en ?? '');
  const [nameHi, setNameHi] = useState(item?.name_hi ?? '');
  const [order, setOrder] = useState(item?.display_order != null ? String(item.display_order) : '');
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const body = {
        name_en: nameEn.trim(),
        name_hi: nameHi.trim() === '' ? null : nameHi.trim(),
        display_order: order.trim() === '' ? null : Number(order),
      };
      if (isEdit && item) await updateMaster(masterKey, item.id, body);
      else await createMaster(masterKey, body);
      toast.success(isEdit ? 'Entry updated.' : 'Entry created.');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit entry' : 'New entry'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} isLoading={saving} disabled={nameEn.trim() === ''}>
            {isEdit ? 'Save changes' : 'Create'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="master-name-en">Name (English)</Label>
          <Input id="master-name-en" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="master-name-hi">नाम (Hindi)</Label>
          <Input id="master-name-hi" value={nameHi} onChange={(e) => setNameHi(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="master-order">Display order</Label>
          <Input id="master-order" type="number" value={order} onChange={(e) => setOrder(e.target.value)} className="max-w-[8rem]" />
        </div>
      </div>
    </Dialog>
  );
}
