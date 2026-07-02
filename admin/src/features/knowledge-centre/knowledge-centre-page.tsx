'use client';

/**
 * Knowledge Centre — a curated reader over Documents tagged with `show_in_knowledge_centre=true`,
 * grouped by knowledge category (codex §4.5). It is NOT a separate backend entity: it reuses the
 * `documents` resource with the `knowledge_centre=true` filter + `knowledge_category` navigation,
 * the shared DataTable, the shared filter framework, and the document columns. Categories and
 * counts come from the backend (knowledge-categories master + per-category list totals).
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { Library } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/layout/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/search-input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/pagination';
import { DataTable, useDataTable } from '@/components/data-table';
import { EmptyState } from '@/components/feedback/empty-state';
import { Skeleton } from '@/components/feedback/skeleton';
import { useFilters, useCrudList } from '@/hooks/crud';
import { useMasterOptions } from '@/components/relationships';
import { cn } from '@/utils/cn';
import { ROUTES } from '@/constants/routes';
import { DOCUMENTS_RESOURCE } from '@/features/documents';
import { documentColumns } from '@/features/documents/components/document-columns';
import type { DocumentSummary } from '@/features/documents/types';

const PUBLICATION_STATES = [
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'unpublished', label: 'Unpublished' },
  { value: 'archived', label: 'Archived' },
];

/** Knowledge Centre uses the document allow-list keys it needs (documents.query.ts). */
const KC_FILTER_KEYS = ['knowledge_category', 'publication_state'];

export function KnowledgeCentrePage() {
  const filters = useFilters({ keys: KC_FILTER_KEYS });
  const table = useDataTable();
  const categories = useMasterOptions('knowledge-categories');

  const activeCategory = filters.filters.knowledge_category ?? '';

  // Always scope to Knowledge-Centre documents; layer the category + state filters on top.
  const query = useMemo(
    () => ({
      ...filters.query,
      knowledge_centre: 'true',
      page: filters.page,
      ordering: table.ordering ?? filters.query.ordering,
    }),
    [filters.query, filters.page, table.ordering],
  );

  const list = useCrudList<DocumentSummary>(DOCUMENTS_RESOURCE, query);

  const columns = useMemo(
    () =>
      documentColumns((row) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`${ROUTES.documents}/${row.id}`}>Preview</Link>
        </Button>
      )),
    [],
  );

  const pagination = list.data?.pagination;
  const activeLabel = categories.options.find((o) => o.value === activeCategory)?.label;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Centre"
        description="Documents explicitly tagged for the Knowledge Centre, organised by category."
        breadcrumbs={
          activeLabel
            ? [{ label: 'Knowledge Centre', href: ROUTES.knowledgeCentre }, { label: activeLabel }]
            : undefined
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <SearchInput value={filters.search} onValueChange={filters.setSearch} placeholder="Search the Knowledge Centre…" className="sm:max-w-sm" />
        <div className="space-y-1">
          <Label htmlFor="kc-state">State</Label>
          <Select
            id="kc-state"
            value={filters.filters.publication_state ?? ''}
            onChange={(e) => filters.setFilter('publication_state', e.target.value || undefined)}
            options={[{ value: '', label: 'All states' }, ...PUBLICATION_STATES]}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        {/* Category navigation with backend counts */}
        <nav aria-label="Knowledge categories" className="space-y-1">
          <CategoryButton
            label="All categories"
            active={!activeCategory}
            onClick={() => filters.setFilter('knowledge_category', undefined)}
            count={<KnowledgeCount categoryId={undefined} />}
          />
          {categories.isLoading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
            : categories.options.map((cat) => (
                <CategoryButton
                  key={cat.value}
                  label={cat.label}
                  active={activeCategory === cat.value}
                  onClick={() => filters.setFilter('knowledge_category', cat.value)}
                  count={<KnowledgeCount categoryId={cat.value} />}
                />
              ))}
        </nav>

        <Card className="p-0">
          <DataTable<DocumentSummary>
            columns={columns}
            data={{
              rows: list.data?.items ?? [],
              totalItems: pagination?.total_items ?? 0,
              totalPages: pagination?.total_pages ?? 0,
              isLoading: list.isLoading,
              isError: list.isError,
              error: list.error,
            }}
            getRowId={(row) => row.id}
            sort={table.sort}
            onSortChange={table.onSortChange}
            onRetry={() => void list.refetch()}
            emptyState={
              <EmptyState
                icon={Library}
                title="No documents in this view"
                description={
                  activeLabel
                    ? `No Knowledge Centre documents in “${activeLabel}” yet.`
                    : 'Tag documents for the Knowledge Centre to see them here.'
                }
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link href={ROUTES.documents}>Go to Documents</Link>
                  </Button>
                }
              />
            }
          />
        </Card>
      </div>

      {pagination ? (
        <Pagination
          page={pagination.page}
          pageSize={pagination.page_size}
          totalItems={pagination.total_items}
          totalPages={pagination.total_pages}
          onPageChange={filters.setPage}
        />
      ) : null}
    </div>
  );
}

function CategoryButton({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'bg-primary/10 font-medium text-primary' : 'text-foreground hover:bg-muted',
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      {count}
    </button>
  );
}

/** Backend-driven count: reads `pagination.total_items` of a 1-row list query (codex §15 — lightweight). */
function KnowledgeCount({ categoryId }: { categoryId: string | undefined }) {
  const { data } = useCrudList<DocumentSummary>(
    DOCUMENTS_RESOURCE,
    {
      knowledge_centre: 'true',
      page_size: 1,
      ...(categoryId ? { knowledge_category: categoryId } : {}),
    },
    { staleTime: 60_000 },
  );
  if (!data) return null;
  return <Badge tone="muted">{data.pagination.total_items}</Badge>;
}
