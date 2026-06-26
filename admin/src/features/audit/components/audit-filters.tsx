'use client';

/**
 * Audit Log filter bar. Exposes EXACTLY the backend's allow-listed audit filters
 * (audit.validators.ts → auditQuerySchema): `module`, `action`, `user_id`, `record_id`,
 * `date_from`, `date_to`. All filtering is server-side through the shared `useFilters` controller;
 * there is no client-side filtering and no `search` filter (the audit endpoint exposes none).
 */

import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { FilterController } from '@/types/crud';
import { AUDIT_ACTIONS, AUDIT_ACTION_LABEL } from '../types';

/** The exact backend allow-list for audit list filtering (audit.validators.ts). */
export const AUDIT_FILTER_KEYS = ['module', 'action', 'user_id', 'record_id', 'date_from', 'date_to'];

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  ...AUDIT_ACTIONS.map((a) => ({ value: a, label: AUDIT_ACTION_LABEL[a] })),
];

export function AuditFilters({ filters }: { filters: FilterController }) {
  const f = filters;
  const sel = (key: string) => f.filters[key] ?? '';

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1">
        <Label htmlFor="audit-filter-action">Action</Label>
        <Select
          id="audit-filter-action"
          value={sel('action')}
          onChange={(e) => f.setFilter('action', e.target.value || undefined)}
          options={ACTION_OPTIONS}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="audit-filter-module">Module</Label>
        <Input
          id="audit-filter-module"
          placeholder="e.g. events, settings, auth"
          value={sel('module')}
          onChange={(e) => f.setFilter('module', e.target.value || undefined)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="audit-filter-user">User ID</Label>
        <Input
          id="audit-filter-user"
          placeholder="User UUID"
          value={sel('user_id')}
          onChange={(e) => f.setFilter('user_id', e.target.value || undefined)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="audit-filter-record">Entity ID</Label>
        <Input
          id="audit-filter-record"
          placeholder="Record UUID"
          value={sel('record_id')}
          onChange={(e) => f.setFilter('record_id', e.target.value || undefined)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="audit-filter-from">From date</Label>
        <DatePicker
          id="audit-filter-from"
          value={sel('date_from')}
          onChange={(e) => f.setFilter('date_from', e.target.value || undefined)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="audit-filter-to">To date</Label>
        <DatePicker
          id="audit-filter-to"
          value={sel('date_to')}
          onChange={(e) => f.setFilter('date_to', e.target.value || undefined)}
        />
      </div>

      {f.isActive ? (
        <div className="sm:col-span-2 lg:col-span-3">
          <Button variant="ghost" size="sm" onClick={f.reset}>
            Clear filters
          </Button>
        </div>
      ) : null}
    </div>
  );
}
