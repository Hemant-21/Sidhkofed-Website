'use client';

/**
 * Grouped search results (Phase 15.2). Results arrive ranked from the backend; we
 * only GROUP them by entity type for scannability (codex §14: results grouped by
 * entity). No client-side filtering or re-ranking. Each group shows its icon,
 * label, and count, then the result cards.
 */

import type { SearchResult } from '@/types/search';
import { CONTENT_TYPE_META } from '../content-type-meta';
import { useGroupedResults } from '../hooks';
import { SearchResultCard } from './search-result-card';

export function SearchResults({
  results,
  onNavigate,
}: {
  results: SearchResult[];
  onNavigate?: () => void;
}) {
  const groups = useGroupedResults(results);

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const meta = CONTENT_TYPE_META[group.type];
        const Icon = meta.icon;
        return (
          <section key={group.type} aria-label={meta.labelPlural}>
            <h3 className="mb-1.5 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {meta.labelPlural}
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {group.results.length}
              </span>
            </h3>
            <ul>
              {group.results.map((result) => (
                <li key={`${result.content_type}:${result.id}`}>
                  <SearchResultCard result={result} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
