'use client';

/**
 * One search result (Phase 15.2). Renders ONLY fields the backend returns —
 * entity icon, bilingual title, summary, content-type badge, and publication date.
 * It does not invent a publication state or highlight text the backend didn't
 * provide. The whole card is a keyboard-focusable link to the corresponding admin
 * record.
 */

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/date';
import type { SearchResult } from '@/types/search';
import { CONTENT_TYPE_META, adminHrefForResult } from '../content-type-meta';
import { cn } from '@/utils/cn';

export function SearchResultCard({
  result,
  onNavigate,
}: {
  result: SearchResult;
  onNavigate?: () => void;
}) {
  const meta = CONTENT_TYPE_META[result.content_type];
  const Icon = meta.icon;

  return (
    <Link
      href={adminHrefForResult(result.content_type, result.id)}
      onClick={onNavigate}
      className={cn(
        'flex gap-3 rounded-md border border-transparent px-3 py-2.5 text-left transition-colors',
        'hover:border-border hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{result.title_en}</span>
          {result.title_hi ? (
            <span className="truncate text-xs text-muted-foreground" lang="hi">
              {result.title_hi}
            </span>
          ) : null}
        </span>
        {result.summary ? (
          <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{result.summary}</span>
        ) : null}
        <span className="mt-1 flex items-center gap-2">
          <Badge tone="muted">{meta.label}</Badge>
          {result.publication_date ? (
            <span className="text-xs text-muted-foreground">{formatDate(result.publication_date)}</span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}
