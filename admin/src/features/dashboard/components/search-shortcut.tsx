'use client';

/**
 * Dashboard Search Shortcut (Phase 15.2). A prominent entry point that opens the
 * global search palette (the same Ctrl/Cmd+K modal mounted by SearchProvider), so
 * search is reachable from the dashboard body in addition to the topbar and the
 * keyboard shortcut.
 */

import { Search } from 'lucide-react';
import { useGlobalSearch } from '@/features/search/search-provider';

export function SearchShortcut() {
  const { open } = useGlobalSearch();
  return (
    <button
      type="button"
      onClick={open}
      className="flex w-full items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">Search events, documents, tenders, and more…</span>
      <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
        Ctrl / ⌘ K
      </kbd>
    </button>
  );
}
