/**
 * Generic, server-driven DataTable types. Reusable by every future module's list
 * page — no module-specific columns live here. Pagination/sorting/filtering all
 * map to the backend list-query contract (page, page_size, ordering, filters).
 */

import type { ReactNode } from 'react';

export type SortDirection = 'asc' | 'desc';

/** Column definition. `accessor` is a key of the row or a render function. */
export interface ColumnDef<TRow> {
  /** Stable column id (used for visibility + ordering key). */
  id: string;
  /** Header label (already localized by the caller). */
  header: ReactNode;
  /** Cell renderer. Receives the whole row. */
  cell: (row: TRow) => ReactNode;
  /** Backend ordering field; enables the sort control when set + present in allow-list. */
  sortField?: string;
  /** Default hidden in the column-visibility menu. */
  defaultHidden?: boolean;
  /** Right-align (numeric) or center. */
  align?: 'left' | 'center' | 'right';
  /** Fixed width (Tailwind class or CSS length). */
  width?: string;
  /** Mark as the action column (rendered last, not sortable/hideable). */
  isActionColumn?: boolean;
}

/** Sorting state mapped to the backend `ordering` param (`field` / `-field`). */
export interface SortState {
  field: string;
  direction: SortDirection;
}

/** The full controlled state of a DataTable. */
export interface TableState {
  page: number;
  pageSize: number;
  search: string;
  sort: SortState | null;
  filters: Record<string, string | number | boolean | undefined>;
  hiddenColumns: string[];
  selectedRowIds: string[];
}

/** What a DataTable needs to render one page of server data. */
export interface TableDataState<TRow> {
  rows: TRow[];
  totalItems: number;
  totalPages: number;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
}
