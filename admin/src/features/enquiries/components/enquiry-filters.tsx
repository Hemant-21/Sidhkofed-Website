'use client';

/**
 * Enquiry list filter bar. Exposes EXACTLY the backend's allow-listed enquiry filters
 * (enquiries.query.ts → ADMIN_FILTER_KEYS): enquiry_type, spam_state, archived, date_from,
 * date_to, commodity, programme. Filtering is server-side via the shared `useFilters` controller;
 * `search` (name/email/subject/organization — enquiries.repository.ts buildWhere) is the common
 * key every list already gets from the framework.
 */
import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { FilterController } from '@/types/crud';
import { useMasterOptions, RelationSelect } from '@/components/relationships';
import { SPAM_STATES, SPAM_STATE_LABEL } from '../types';

/** The exact backend allow-list for enquiry list filtering (enquiries.query.ts). */
export const ENQUIRY_FILTER_KEYS = [
  'enquiry_type',
  'spam_state',
  'archived',
  'date_from',
  'date_to',
  'commodity',
  'programme',
];

const SPAM_STATE_OPTIONS = [
  { value: '', label: 'All' },
  ...SPAM_STATES.map((s) => ({ value: s, label: SPAM_STATE_LABEL[s] })),
];

const ARCHIVED_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'false', label: 'Active (not archived)' },
  { value: 'true', label: 'Archived only' },
];

export function EnquiryFilters({ filters }: { filters: FilterController }) {
  const f = filters;
  const enquiryTypes = useMasterOptions('enquiry-types');
  const commodities = useMasterOptions('commodities');
  const sel = (key: string) => f.filters[key] ?? '';

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          value={f.search}
          onValueChange={f.setSearch}
          placeholder="Search name, email, subject, organisation…"
          className="sm:max-w-sm"
        />
        {f.isActive ? (
          <Button variant="ghost" size="sm" onClick={f.reset}>
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="enquiry-filter-type">Enquiry type</Label>
          <Select
            id="enquiry-filter-type"
            value={sel('enquiry_type')}
            onChange={(e) => f.setFilter('enquiry_type', e.target.value || undefined)}
            options={[{ value: '', label: 'All' }, ...enquiryTypes.options]}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="enquiry-filter-spam">Spam state</Label>
          <Select
            id="enquiry-filter-spam"
            value={sel('spam_state')}
            onChange={(e) => f.setFilter('spam_state', e.target.value || undefined)}
            options={SPAM_STATE_OPTIONS}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="enquiry-filter-archived">Status</Label>
          <Select
            id="enquiry-filter-archived"
            value={sel('archived')}
            onChange={(e) => f.setFilter('archived', e.target.value || undefined)}
            options={ARCHIVED_OPTIONS}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="enquiry-filter-commodity">Commodity</Label>
          <Select
            id="enquiry-filter-commodity"
            value={sel('commodity')}
            onChange={(e) => f.setFilter('commodity', e.target.value || undefined)}
            options={[{ value: '', label: 'All' }, ...commodities.options]}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="enquiry-filter-programme">Programme / scheme</Label>
          <RelationSelect
            id="enquiry-filter-programme"
            resource="programmes"
            value={sel('programme')}
            onChange={(v) => f.setFilter('programme', v)}
            placeholder="All"
            searchPlaceholder="Search programmes…"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="enquiry-filter-from">Submitted from</Label>
          <DatePicker
            id="enquiry-filter-from"
            value={sel('date_from')}
            onChange={(e) => f.setFilter('date_from', e.target.value || undefined)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="enquiry-filter-to">Submitted to</Label>
          <DatePicker
            id="enquiry-filter-to"
            value={sel('date_to')}
            onChange={(e) => f.setFilter('date_to', e.target.value || undefined)}
          />
        </div>
      </div>
    </div>
  );
}
