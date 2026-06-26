'use client';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { FilterController } from '@/types/crud';

export const USER_FILTER_KEYS = ['search', 'is_active', 'role'];

const STATUS_OPTIONS = [
  { value: '', label: 'All users' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

export function UserFilters({ filters }: { filters: FilterController }) {
  const f = filters;
  const sel = (key: string) => f.filters[key] ?? '';

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1 sm:col-span-2 lg:col-span-1">
        <Label htmlFor="user-filter-search">Search</Label>
        <Input
          id="user-filter-search"
          placeholder="Name or email"
          value={sel('search')}
          onChange={(e) => f.setFilter('search', e.target.value || undefined)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="user-filter-status">Status</Label>
        <Select
          id="user-filter-status"
          value={sel('is_active')}
          onChange={(e) => f.setFilter('is_active', e.target.value || undefined)}
          options={STATUS_OPTIONS}
        />
      </div>

      {f.isActive ? (
        <div className="flex items-end sm:col-span-2 lg:col-span-1">
          <Button variant="ghost" size="sm" onClick={f.reset}>
            Clear filters
          </Button>
        </div>
      ) : null}
    </div>
  );
}
