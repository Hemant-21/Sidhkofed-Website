/**
 * Dashboard Report service — business logic for the FIXED report definitions. Reports are not
 * arbitrary: `report_key` must be a predefined fixed key (validated in the validator), the key is
 * immutable after creation, and there is no report/chart builder. Owns: duplicate-key prevention,
 * publishing lifecycle (reuses the shared workflow helpers), audit logging, and public-cache
 * invalidation. No HTTP, no Prisma here.
 */
import { NotFoundError, ConflictError } from '@/shared/errors';
import { applyLifecycle, lifecycleEvent, type LifecycleAction } from '@/shared/publishing';
import { auditService, type AuditContext } from '@/modules/audit/audit.service';
import { dashboardRepository, type ReportRow } from './dashboard.repository';
import {
  toReportSummaryDto,
  toReportDetailDto,
  type ReportSummaryDto,
  type ReportDetailDto,
} from './dashboard.dto';
import { DASHBOARD_REPORT_ENTITY, type ReportFilters, type ReportOrderingField } from './dashboard.types';
import type { ReportCreateInput, ReportUpdateInput } from './dashboard.validators';
import { invalidateDashboardCache, requireUser } from './dashboard.shared';
import type { Prisma } from '@prisma/client';

function loaded(row: ReportRow | null): ReportRow {
  if (!row) throw new NotFoundError('Dashboard report not found.');
  return row;
}

export async function create(input: ReportCreateInput, ctx: AuditContext): Promise<ReportDetailDto> {
  const userId = requireUser(ctx);
  if (await dashboardRepository.reportKeyExists(input.report_key)) {
    throw new ConflictError('A dashboard report with this report key already exists.');
  }
  const created = await dashboardRepository.createReport({
    reportKey: input.report_key,
    titleEn: input.title_en,
    titleHi: input.title_hi ?? null,
    descriptionEn: input.description_en ?? null,
    descriptionHi: input.description_hi ?? null,
    layoutConfig: (input.layout_config ?? null) as Prisma.InputJsonValue,
    isActive: input.is_active ?? true,
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
  await auditService.create(ctx, DASHBOARD_REPORT_ENTITY, created.id, {
    report_key: created.reportKey,
    title_en: created.titleEn,
  });
  await invalidateDashboardCache();
  return toReportDetailDto(created);
}

export async function update(id: string, input: ReportUpdateInput, ctx: AuditContext): Promise<ReportDetailDto> {
  const userId = requireUser(ctx);
  loaded(await dashboardRepository.findReportById(id));
  const data: Prisma.DashboardReportUncheckedUpdateInput = { updatedById: userId };
  if (input.title_en !== undefined) data.titleEn = input.title_en;
  if (input.title_hi !== undefined) data.titleHi = input.title_hi;
  if (input.description_en !== undefined) data.descriptionEn = input.description_en;
  if (input.description_hi !== undefined) data.descriptionHi = input.description_hi;
  if (input.layout_config !== undefined) data.layoutConfig = (input.layout_config ?? null) as Prisma.InputJsonValue;
  if (input.is_active !== undefined) data.isActive = input.is_active;
  if (input.public_visibility !== undefined) data.publicVisibility = input.public_visibility;
  if (input.publish_start_at !== undefined) data.publishStartAt = input.publish_start_at;
  if (input.highlight_type !== undefined) data.highlightType = input.highlight_type;
  if (input.highlight_start_at !== undefined) data.highlightStartAt = input.highlight_start_at;
  if (input.highlight_end_at !== undefined) data.highlightEndAt = input.highlight_end_at;
  if (input.display_order !== undefined) data.displayOrder = input.display_order;
  if (input.show_on_homepage !== undefined) data.showOnHomepage = input.show_on_homepage;

  const updated = await dashboardRepository.updateReport(id, data);
  await auditService.update(ctx, DASHBOARD_REPORT_ENTITY, id, undefined, { report_key: updated.reportKey });
  await invalidateDashboardCache();
  return toReportDetailDto(updated);
}

export async function getById(id: string): Promise<ReportDetailDto> {
  return toReportDetailDto(loaded(await dashboardRepository.findReportById(id)));
}

export interface ReportListResult {
  items: ReportSummaryDto[];
  total: number;
}

export async function list(
  filters: ReportFilters,
  ordering: { field: ReportOrderingField; direction: 'asc' | 'desc' },
  skip: number,
  take: number,
): Promise<ReportListResult> {
  const { rows, total } = await dashboardRepository.listReports(filters, skip, take, { ordering });
  return { items: rows.map(toReportSummaryDto), total };
}

export async function lifecycle(id: string, action: LifecycleAction, ctx: AuditContext): Promise<ReportDetailDto> {
  const userId = requireUser(ctx);
  const existing = loaded(await dashboardRepository.findReportById(id));
  const change = applyLifecycle(
    {
      publicationState: existing.publicationState,
      publishedAt: existing.publishedAt,
      archivedAt: existing.archivedAt,
    },
    action,
  );
  const updated = await dashboardRepository.updateReport(id, { ...change, updatedById: userId });
  await auditService.log(lifecycleEvent(action), ctx, {
    module: DASHBOARD_REPORT_ENTITY,
    recordId: id,
    previousState: existing.publicationState,
    newState: change.publicationState,
  });
  await invalidateDashboardCache();
  return toReportDetailDto(updated);
}

export const reportService = { create, update, getById, list, lifecycle };
