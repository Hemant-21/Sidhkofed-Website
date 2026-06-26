'use client';

import { Columns3 } from 'lucide-react';
import type { ColumnDef } from '@/types/table';
import { Dropdown } from '@/components/ui/dropdown';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

/** Column show/hide menu for the DataTable. Action columns are never hideable. */
export function ColumnVisibility<TRow>({
  columns,
  hidden,
  onChange,
}: {
  columns: ColumnDef<TRow>[];
  hidden: string[];
  onChange: (hidden: string[]) => void;
}) {
  const toggleable = columns.filter((c) => !c.isActionColumn);
  const toggle = (id: string) =>
    onChange(hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id]);

  return (
    <Dropdown
      align="end"
      trigger={
        <Button variant="outline" size="sm" leftIcon={<Columns3 className="h-4 w-4" aria-hidden="true" />}>
          Columns
        </Button>
      }
      items={toggleable.map((col) => ({
        label: (
          <span className="flex items-center gap-2">
            <Checkbox checked={!hidden.includes(col.id)} readOnly tabIndex={-1} />
            <span className="capitalize">{typeof col.header === 'string' ? col.header : col.id}</span>
          </span>
        ),
        onSelect: () => toggle(col.id),
      }))}
    />
  );
}
