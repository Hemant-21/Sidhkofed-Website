/**
 * Generic CRUD-framework types. These describe the *reusable* surfaces every
 * future module composes — resource config, relationship selectors, declarative
 * filters, and bulk actions. No module-specific fields live here (codex: reuse
 * over duplication). They sit on top of the api/common primitives.
 */

import type { ListQuery } from './api';

/**
 * Turns a single kebab-case resource name into a full CRUD surface. A future
 * module page passes one of these to the hooks/components instead of re-wiring
 * endpoints, permissions, and copy by hand.
 */
export interface ResourceConfig {
  /** kebab-case admin resource segment (API spec §3), e.g. `events`. */
  resource: string;
  /** Permission module prefix; defaults to `resource` (e.g. `events.publish`). */
  permissionModule?: string;
  /** Singular human label for confirmations/toasts, e.g. `event`. */
  label?: string;
  /** Plural human label, e.g. `events`. */
  labelPlural?: string;
}

/**
 * A linkable entity reference used by relationship selectors. The owning module's
 * mapper resolves a raw API record into this shape (`id` + display text), so the
 * selector itself stays module-agnostic.
 */
export interface EntityRef {
  id: string;
  /** Display text (already localized by the caller). */
  label: string;
  /** Optional secondary line (e.g. district, type). */
  sublabel?: string | null;
  /** Disable selection (e.g. a deactivated master — codex §6). */
  disabled?: boolean;
}

/** An async-selector option that also keeps the raw record for richer callers. */
export interface RelationOption extends EntityRef {
  raw?: unknown;
}

/** Declarative filter-field kinds the FilterBar framework understands. */
export type FilterKind =
  | 'search'
  | 'select'
  | 'multi-select'
  | 'date-range'
  | 'boolean'
  | 'relation';

/** One declarative filter control (server-side filtering; key must be allow-listed). */
export interface FilterFieldDef {
  /** Query-param key (snake_case) — must be in the backend allow-list (API spec §1.4). */
  key: string;
  label: string;
  kind: FilterKind;
  /** Options for `select`/`multi-select`. */
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  /** For `relation` kind: the resource/master to resolve options from. */
  relationResource?: string;
}

/** Normalized, URL-friendly filter state (string values only). */
export type FilterState = Record<string, string | undefined>;

/** Confirmation copy reused by destructive bulk/lifecycle actions. */
export interface ConfirmCopy {
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: 'primary' | 'danger';
}

/** A reusable bulk-action descriptor (publish/archive/restore/delete/…). */
export interface BulkActionDef<TRow = unknown> {
  id: string;
  label: string;
  /** Permission key gating the action (checked against the user's grants). */
  permission?: string;
  tone?: 'default' | 'danger';
  /** When set, the runner confirms once before fanning out over the selection. */
  confirm?: ConfirmCopy;
  /** Executes the action for one id; the runner fans out + aggregates outcomes. */
  run: (id: string, row?: TRow) => Promise<unknown>;
}

/** Aggregated outcome of running a bulk action over a selection. */
export interface BulkResult {
  total: number;
  succeeded: string[];
  failed: Array<{ id: string; error: unknown }>;
}

/**
 * Mixins for module DTOs that participate in the shared relationship pickers. A
 * module's Create/Update DTO can extend these so the media/document selectors and
 * hooks are reusable without redeclaring the relation arrays each time.
 */
export interface MediaSelectable {
  cover_media_id?: string | null;
  gallery_ids?: string[];
}

export interface DocumentSelectable {
  document_ids?: string[];
}

/** A query plus the controls that produced it (returned by the filter framework). */
export interface FilterController {
  /** The composed, backend-ready list query. */
  query: ListQuery;
  filters: FilterState;
  search: string;
  ordering: string | undefined;
  page: number;
  setFilter: (key: string, value: string | undefined) => void;
  setSearch: (value: string) => void;
  setOrdering: (value: string | undefined) => void;
  setPage: (page: number) => void;
  reset: () => void;
  /** True when any filter/search/ordering is active. */
  isActive: boolean;
}
