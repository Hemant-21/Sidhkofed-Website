import Link from 'next/link';

export interface ChipItem {
  href?: string;
  label: string;
}

/** Compact, optionally-linked chips for related masters/records (commodities, etc.). */
export function Chips({ items }: { items: ChipItem[] }) {
  const visible = items.filter((c) => c.label);
  if (visible.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {visible.map((c, i) => (
        <li key={i}>
          {c.href ? (
            <Link
              href={c.href}
              className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground hover:border-primary hover:text-primary"
            >
              {c.label}
            </Link>
          ) : (
            <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
              {c.label}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
