import type { ReactNode } from 'react';

/** Definition list for record metadata. Rows with empty values are dropped. */
export function MetaList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  const rows = items.filter((i) => i.value !== null && i.value !== undefined && i.value !== '');
  if (rows.length === 0) return null;
  return (
    <dl className="space-y-3 text-sm">
      {rows.map((row, i) => (
        <div key={i}>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{row.label}</dt>
          <dd className="mt-0.5 text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
