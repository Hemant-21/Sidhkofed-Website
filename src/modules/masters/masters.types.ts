/**
 * Shared types for the generic master framework (TASK 3).
 *
 * The masters module implements all 16 reusable lookup tables through ONE config-driven
 * pipeline instead of 16 duplicated CRUD stacks. A `MasterDefinition` is the single source
 * of per-master behavior; the base repository/service/validator/controller are entirely
 * generic and read everything they need from the definition registry.
 */
import type { ZodTypeAny } from 'zod';
import type { AuditContext } from '@/modules/audit/audit.service';

/** A master row as returned by Prisma — kept structural so the framework stays generic. */
export type MasterRow = Record<string, unknown>;

/** Validated, normalized create/update input (snake_case API fields). */
export type MasterInput = Record<string, unknown>;

/** The subset of a Prisma model delegate the generic repository uses. */
export interface MasterDelegate {
  findUnique(args: Record<string, unknown>): Promise<MasterRow | null>;
  findFirst(args: Record<string, unknown>): Promise<MasterRow | null>;
  findMany(args: Record<string, unknown>): Promise<MasterRow[]>;
  count(args?: Record<string, unknown>): Promise<number>;
  create(args: Record<string, unknown>): Promise<MasterRow>;
  update(args: Record<string, unknown>): Promise<MasterRow>;
}

/** Context passed to a definition's referential `validate` hook. */
export interface MasterValidationContext {
  mode: 'create' | 'update';
  input: MasterInput;
  /** The existing row (update only). */
  existing?: MasterRow;
  /** The master's own definition — lets the hook run repository lookups for itself. */
  def: MasterDefinition;
}

/** A resolved list filter: the Prisma `where` fragment plus a cache-key suffix. */
export interface MasterFilter {
  where: Record<string, unknown>;
  cacheSuffix: string;
}

/**
 * Everything that makes one master distinct. The generic pipeline reads this; nothing
 * about a specific master lives in the repository/service/controller.
 */
export interface MasterDefinition {
  /** Kebab-case route key, e.g. `event-types` (API spec §4 `{master_key}`). */
  key: string;
  /** Prisma model delegate property, e.g. `eventType`. */
  model: string;
  /** Audit module name, e.g. `event_types`. */
  module: string;
  /** Human label for messages, e.g. `Event type`. */
  label: string;
  /** The unique human-identity field used for duplicate detection and slug source. */
  identity: 'name_en' | 'label';
  /** Whether the table has a `slug` column (financial_years has none). */
  hasSlug: boolean;
  /** Whether the table has a `display_order` column (financial_years has none). */
  hasDisplayOrder: boolean;
  /** Cache the public active list in Redis (TASK 21). */
  cacheable: boolean;
  /** Exposed under `/public/masters/{key}` (tags are internal-only). */
  isPublic: boolean;
  /** Prisma `include` for relations returned in the DTO (e.g. commodity icon, block district). */
  include?: Record<string, unknown>;
  /** Zod schema for POST bodies. */
  createSchema: ZodTypeAny;
  /** Zod schema for PATCH bodies (partial). */
  updateSchema: ZodTypeAny;
  /** Map validated create input → Prisma create data (slug/id/timestamps added by the base). */
  buildCreateData(input: MasterInput): Record<string, unknown>;
  /** Map validated update input → Prisma update data (never includes slug — slugs are stable). */
  buildUpdateData(input: MasterInput): Record<string, unknown>;
  /**
   * Prisma `where` (camelCase) identifying a duplicate of this input, or null when the
   * relevant fields are absent (e.g. a partial PATCH). The DB unique constraint + P2002
   * translation is the authoritative guard; this is the friendly pre-check.
   */
  duplicateWhere(input: MasterInput): Record<string, unknown> | null;
  /** Optional referential / cross-field validation needing DB lookups. */
  validate?(ctx: MasterValidationContext): Promise<void>;
  /** Row → snake_case API DTO. */
  serialize(row: MasterRow): Record<string, unknown>;
  /** Columns (camelCase) scanned by `?search=`. */
  searchFields: string[];
  /** Allow-listed `?ordering=` API fields. */
  orderingAllowList: readonly string[];
  /** Fallback ordering (Prisma camelCase field). */
  defaultOrder: { field: string; direction: 'asc' | 'desc' };
  /** Optional list filter resolver (e.g. blocks by district). */
  resolveFilter?(query: Record<string, unknown>): MasterFilter;
}

/** Re-exported for service signatures. */
export type { AuditContext };
