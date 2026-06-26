'use client';

/**
 * Content-by-State summary (Phase 15.2) — satisfies the Draft Summary + Published
 * Summary requirements in one efficient widget. For a fixed set of content
 * modules it shows the BACKEND total in each publication state (draft / published
 * / archived). Every number is the server's `pagination.total_items` for that
 * resource+state filter — never a client-side tally.
 */

import { Layers } from 'lucide-react';
import { Skeleton } from '@/components/feedback/skeleton';
import { formatNumber } from '@/utils/format';
import type { PublicationState } from '@/types/common';
import { useContentCounts, type ContentCountSpec } from '../hooks';
import { DashboardCard } from './cards';

interface ModuleRow {
  key: string;
  label: string;
  resource: string;
}

const MODULES: ModuleRow[] = [
  { key: 'events', label: 'Events', resource: 'events' },
  { key: 'documents', label: 'Documents', resource: 'documents' },
  { key: 'programmes', label: 'Programmes', resource: 'programmes' },
  { key: 'institutions', label: 'Institutions', resource: 'institutions' },
  { key: 'communications', label: 'Communications', resource: 'official-communications' },
];

const STATES: { key: PublicationState; label: string }[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'published', label: 'Published' },
  { key: 'archived', label: 'Archived' },
];

// One count query per (module × state); each is independently cached + lightweight.
const SPECS: ContentCountSpec[] = MODULES.flatMap((m) =>
  STATES.map((s) => ({
    key: `${m.key}:${s.key}`,
    resource: m.resource,
    filters: { publication_state: s.key },
  })),
);

export function ContentStateSummary() {
  const results = useContentCounts(SPECS);
  const at = (moduleIndex: number, stateIndex: number) => results[moduleIndex * STATES.length + stateIndex];

  return (
    <DashboardCard
      title="Content by State"
      description="Backend totals per module — drafts pending publication, published, and archived"
      icon={Layers}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Record counts by module and publication state</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="py-2 pr-4 font-medium">
                Module
              </th>
              {STATES.map((s) => (
                <th key={s.key} scope="col" className="py-2 px-3 text-right font-medium">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((m, mi) => (
              <tr key={m.key} className="border-b border-border last:border-0">
                <th scope="row" className="py-2.5 pr-4 text-left font-medium text-foreground">
                  {m.label}
                </th>
                {STATES.map((s, si) => {
                  const q = at(mi, si);
                  return (
                    <td key={s.key} className="py-2.5 px-3 text-right tabular-nums">
                      {q?.isLoading ? (
                        <Skeleton className="ml-auto h-4 w-8" />
                      ) : q?.error ? (
                        <button
                          type="button"
                          onClick={() => q.refetch()}
                          className="text-danger underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          retry
                        </button>
                      ) : (
                        <span className={s.key === 'draft' && (q?.data ?? 0) > 0 ? 'font-semibold text-warning' : 'text-foreground'}>
                          {formatNumber(q?.data ?? 0)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
}
