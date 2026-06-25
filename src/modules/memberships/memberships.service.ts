/**
 * Institutional Membership service — all business logic for the membership operation. No HTTP, no
 * Prisma here (repository owns Prisma; controllers own HTTP). Owns: CRUD + lifecycle, stable slug
 * generation, reference/master-activation validation, the District-Union requirement rule, bulk
 * upload (validate-all-rows → one transaction), audit logging, and Redis cache invalidation.
 *
 * Key rules (CMS requirements §4.15 / build-context §8.3): institution-wise membership ONLY;
 * the member and the District Union are existing Institution records (never duplicated); two
 * orthogonal axes (level × type) feed dashboard reports #10–#13. This module is a DATA SOURCE —
 * it performs NO aggregation/metrics (Phase 12).
 */
import { NotFoundError, ValidationError } from '@/shared/errors';
import { uniqueSlug } from '@/utils/slug';
import { applyLifecycle, lifecycleEvent, type LifecycleAction } from '@/shared/publishing';
import { assertEditableByActor } from '@/shared/content-guard';
import { cacheService } from '@/services/cache';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import {
  membershipRepository,
  type MembershipRow,
  type MembershipRefs,
} from './memberships.repository';
import {
  toMembershipDetailDto,
  toMembershipSummaryDto,
  toPublicMembershipSummaryDto,
  toPublicMembershipDetailDto,
  type MembershipDetailDto,
  type PublicMembershipDetailDto,
} from './memberships.dto';
import {
  MEMBERSHIP_ENTITY,
  type MembershipFilters,
  type MembershipOrderingField,
} from './memberships.types';
import {
  MEMBERSHIP_PERMISSIONS,
  MEMBERSHIP_PERMISSION_TO_CONTENT,
} from './memberships.permissions';
import {
  membershipBulkRowSchema,
  type MembershipCreateInput,
  type MembershipUpdateInput,
  type MembershipBulkRowInput,
} from './memberships.validators';

const PUBLIC_CACHE_PREFIX = 'memberships:public';
const PUBLISH_PERMISSION =
  MEMBERSHIP_PERMISSION_TO_CONTENT[MEMBERSHIP_PERMISSIONS.publish] ?? 'content.publish';

function loaded(row: MembershipRow | null): MembershipRow {
  if (!row) throw new NotFoundError('Membership not found.');
  return row;
}

async function invalidatePublicCache(): Promise<void> {
  await cacheService.delByPrefix(`${PUBLIC_CACHE_PREFIX}:`);
}

function requireUser(ctx: AuditContext): string {
  if (!ctx.userId) throw new ValidationError({ _: ['An authenticated user is required.'] });
  return ctx.userId;
}

async function assertReferencesValid(refs: MembershipRefs): Promise<void> {
  const errors = await membershipRepository.validateReferences(refs);
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
}

/** Build the stable slug source: institution name + level + type (no member title field exists). */
async function slugSource(institutionId: string, level: string, type: string): Promise<string> {
  const name = (await membershipRepository.institutionName(institutionId)) ?? 'membership';
  return `${name}-${level}-${type}`;
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function create(
  input: MembershipCreateInput,
  ctx: AuditContext,
): Promise<MembershipDetailDto> {
  const userId = requireUser(ctx);
  await assertReferencesValid({
    institutionId: input.institution_id,
    districtUnionId: input.district_union_id ?? null,
    districtId: input.district_id ?? null,
    reportingPeriodId: input.reporting_period_id ?? null,
  });

  const slug = await uniqueSlug(
    await slugSource(input.institution_id, input.membership_level, input.membership_type),
    membershipRepository.slugExists,
  );

  const created = await membershipRepository.create({
    institutionId: input.institution_id,
    membershipLevel: input.membership_level,
    membershipType: input.membership_type,
    membershipNumber: input.membership_number ?? null,
    districtId: input.district_id ?? null,
    districtUnionId: input.district_union_id ?? null,
    reportingPeriodId: input.reporting_period_id ?? null,
    status: input.status ?? 'active',
    joinDate: input.join_date ?? null,
    notesEn: input.notes_en ?? null,
    notesHi: input.notes_hi ?? null,
    slug,
    publicVisibility: input.public_visibility ?? true,
    publishStartAt: input.publish_start_at ?? null,
    highlightType: input.highlight_type ?? null,
    highlightStartAt: input.highlight_start_at ?? null,
    highlightEndAt: input.highlight_end_at ?? null,
    displayOrder: input.display_order ?? null,
    showOnHomepage: input.show_on_homepage ?? false,
    createdById: userId,
    updatedById: userId,
  });

  await auditService.create(ctx, MEMBERSHIP_ENTITY, created.id, {
    institution_id: created.institutionId,
    membership_level: created.membershipLevel,
    membership_type: created.membershipType,
    slug: created.slug,
  });
  await invalidatePublicCache();
  return toMembershipDetailDto(created);
}

// ── Update (PATCH — partial; never transitions publication state, never changes slug) ──
export async function update(
  id: string,
  input: MembershipUpdateInput,
  ctx: AuditContext,
): Promise<MembershipDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await membershipRepository.findById(id));
  assertEditableByActor(ctx.authz, existing.publicationState, PUBLISH_PERMISSION);

  // Re-validate only the references this PATCH actually touches.
  const refs: MembershipRefs = {};
  if (input.institution_id !== undefined) refs.institutionId = input.institution_id;
  if (input.district_union_id !== undefined) refs.districtUnionId = input.district_union_id;
  if (input.district_id !== undefined) refs.districtId = input.district_id;
  if (input.reporting_period_id !== undefined) refs.reportingPeriodId = input.reporting_period_id;
  if (Object.keys(refs).length > 0) await assertReferencesValid(refs);

  // District-Union requirement re-evaluated against the EFFECTIVE (post-PATCH) state, so a partial
  // edit cannot leave a district_union membership without its DU org.
  const effectiveLevel = input.membership_level ?? existing.membershipLevel;
  const effectiveDuId =
    input.district_union_id !== undefined ? input.district_union_id : existing.districtUnionId;
  if (effectiveLevel === 'district_union' && !effectiveDuId) {
    throw new ValidationError({
      district_union_id: ['Required when membership_level is district_union.'],
    });
  }

  const updated = await membershipRepository.update(id, {
    institutionId: input.institution_id,
    membershipLevel: input.membership_level,
    membershipType: input.membership_type,
    membershipNumber: input.membership_number,
    districtId: input.district_id,
    districtUnionId: input.district_union_id,
    reportingPeriodId: input.reporting_period_id,
    status: input.status,
    joinDate: input.join_date,
    notesEn: input.notes_en,
    notesHi: input.notes_hi,
    publicVisibility: input.public_visibility,
    publishStartAt: input.publish_start_at,
    highlightType: input.highlight_type,
    highlightStartAt: input.highlight_start_at,
    highlightEndAt: input.highlight_end_at,
    displayOrder: input.display_order,
    showOnHomepage: input.show_on_homepage,
    updatedById: userId,
  });

  await auditService.update(ctx, MEMBERSHIP_ENTITY, id, undefined, { slug: updated.slug });
  await invalidatePublicCache();
  return toMembershipDetailDto(updated);
}

// ── Read ───────────────────────────────────────────────────────────────────────
export async function getById(id: string): Promise<MembershipDetailDto> {
  return toMembershipDetailDto(loaded(await membershipRepository.findById(id)));
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

export async function list(
  filters: MembershipFilters,
  ordering: { field: MembershipOrderingField; direction: 'asc' | 'desc' },
  skip: number,
  take: number,
): Promise<ListResult<ReturnType<typeof toMembershipSummaryDto>>> {
  const { rows, total } = await membershipRepository.list(filters, skip, take, { ordering });
  return { items: rows.map(toMembershipSummaryDto), total };
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────
export async function lifecycle(
  id: string,
  action: LifecycleAction,
  ctx: AuditContext,
): Promise<MembershipDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await membershipRepository.findById(id));
  const change = applyLifecycle(
    {
      publicationState: existing.publicationState,
      publishedAt: existing.publishedAt,
      archivedAt: existing.archivedAt,
    },
    action,
  );
  const updated = await membershipRepository.update(id, { ...change, updatedById: userId });
  await auditService.log(lifecycleEvent(action), ctx, {
    module: MEMBERSHIP_ENTITY,
    recordId: id,
    previousState: existing.publicationState,
    newState: change.publicationState,
  });
  await invalidatePublicCache();
  return toMembershipDetailDto(updated);
}

// ── Bulk upload (API spec §6) ──────────────────────────────────────────────────
export interface BulkUploadResult {
  created_count: number;
  skipped_count: number;
  errors: Array<{ row: number; fields: Record<string, string[]> }>;
}

/**
 * Validate EVERY row first (shape + references + DU rule); valid rows are created in ONE
 * transaction, invalid rows are skipped and reported. Slugs are generated per row against the
 * transaction client, so duplicates within the same batch are de-duplicated correctly.
 */
export async function bulkUpload(rows: unknown[], ctx: AuditContext): Promise<BulkUploadResult> {
  const userId = requireUser(ctx);
  const errors: Array<{ row: number; fields: Record<string, string[]> }> = [];
  const valid: Array<{ index: number; data: MembershipBulkRowInput }> = [];

  for (let i = 0; i < rows.length; i += 1) {
    const parsed = membershipBulkRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      const fields: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.length ? issue.path.join('.') : '_';
        (fields[key] ??= []).push(issue.message);
      }
      errors.push({ row: i, fields });
      continue;
    }
    const refErrors = await membershipRepository.validateReferences({
      institutionId: parsed.data.institution_id,
      districtUnionId: parsed.data.district_union_id ?? null,
      districtId: parsed.data.district_id ?? null,
      reportingPeriodId: parsed.data.reporting_period_id ?? null,
    });
    if (Object.keys(refErrors).length > 0) {
      errors.push({ row: i, fields: refErrors });
      continue;
    }
    valid.push({ index: i, data: parsed.data });
  }

  let createdCount = 0;
  const createdIds: string[] = [];
  if (valid.length > 0) {
    await membershipRepository.transaction(async (tx) => {
      for (const { data } of valid) {
        const slug = await uniqueSlug(
          `${(await membershipRepository.institutionName(data.institution_id, tx)) ?? 'membership'}-${data.membership_level}-${data.membership_type}`,
          (candidate) => membershipRepository.slugExists(candidate, tx),
        );
        const created = await membershipRepository.create(
          {
            institutionId: data.institution_id,
            membershipLevel: data.membership_level,
            membershipType: data.membership_type,
            membershipNumber: data.membership_number ?? null,
            districtId: data.district_id ?? null,
            districtUnionId: data.district_union_id ?? null,
            reportingPeriodId: data.reporting_period_id ?? null,
            status: data.status ?? 'active',
            joinDate: data.join_date ?? null,
            notesEn: data.notes_en ?? null,
            notesHi: data.notes_hi ?? null,
            slug,
            createdById: userId,
            updatedById: userId,
          },
          tx,
        );
        createdIds.push(created.id);
        createdCount += 1;
      }
    });
  }

  await auditService.create(ctx, MEMBERSHIP_ENTITY, 'bulk', {
    created_count: createdCount,
    skipped_count: errors.length,
    created_ids: createdIds,
  });
  if (createdCount > 0) await invalidatePublicCache();

  return { created_count: createdCount, skipped_count: errors.length, errors };
}

// ── Public reads (visibility predicate + Redis cache) ──────────────────────────
export async function publicList(
  filters: MembershipFilters,
  ordering: { field: MembershipOrderingField; direction: 'asc' | 'desc' },
  page: { skip: number; take: number; page: number; pageSize: number },
  cacheKey: string,
): Promise<ListResult<ReturnType<typeof toPublicMembershipSummaryDto>>> {
  const cached =
    await cacheService.getJson<ListResult<ReturnType<typeof toPublicMembershipSummaryDto>>>(
      cacheKey,
    );
  if (cached) return cached;
  const { rows, total } = await membershipRepository.list(filters, page.skip, page.take, {
    public: true,
    ordering,
  });
  const result = { items: rows.map(toPublicMembershipSummaryDto), total };
  await cacheService.setJson(cacheKey, result);
  return result;
}

export async function publicDetailBySlug(slug: string): Promise<PublicMembershipDetailDto> {
  const cacheKey = `${PUBLIC_CACHE_PREFIX}:slug:${slug}`;
  const cached = await cacheService.getJson<PublicMembershipDetailDto>(cacheKey);
  if (cached) return cached;
  const row = await membershipRepository.findBySlug(slug, { public: true });
  if (!row) throw new NotFoundError('Membership not found.');
  const dto = toPublicMembershipDetailDto(row);
  await cacheService.setJson(cacheKey, dto);
  return dto;
}

export const membershipService = {
  create,
  update,
  getById,
  list,
  lifecycle,
  bulkUpload,
  publicList,
  publicDetailBySlug,
};
