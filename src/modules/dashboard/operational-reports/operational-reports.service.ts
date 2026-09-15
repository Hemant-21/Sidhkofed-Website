/**
 * Operational Reports service — validates input, resolves the period, calls the repository (the
 * module's only Prisma caller), and shapes the `ReportResult` contract (summary measures +
 * paginated supporting rows + completeness + calculation metadata).
 */
import { PayloadTooLargeError, ValidationError } from '@/shared/errors';
import { OPERATIONAL_REPORTS, REPORT_KEYS } from './operational-reports.registry';
import { resolvePeriod } from './operational-reports.period';
import { operationalReportsRepository as repo } from './operational-reports.repository';
import { validateGenerateBody, validateExportBody } from './operational-reports.validators';
import type {
  CompletenessInfo,
  MeasureResult,
  ReportDefinition,
  ReportKey,
  ReportResult,
} from './operational-reports.types';

function listCatalogue(): ReportDefinition[] {
  return REPORT_KEYS.map((k) => OPERATIONAL_REPORTS[k]);
}

async function generate(reportKey: string, body: unknown): Promise<ReportResult> {
  if (!Object.prototype.hasOwnProperty.call(OPERATIONAL_REPORTS, reportKey)) {
    throw new ValidationError({ reportKey: [`Unknown report key "${reportKey}".`] });
  }
  const key = reportKey as ReportKey;
  const input = validateGenerateBody(key, body);
  const period = await resolvePeriod(input.periodInput);

  const skip = (input.page - 1) * input.pageSize;
  const take = input.pageSize;

  const { summary, rows, total } = await computeReport(key, period, input.filters, skip, take);

  return {
    reportKey: key,
    resolvedPeriod: period,
    filters: input.filters,
    summary,
    rows: { items: rows, total, page: input.page, pageSize: input.pageSize },
    calculatedAt: new Date(),
  };
}

async function computeReport(
  key: ReportKey,
  period: Awaited<ReturnType<typeof resolvePeriod>>,
  filters: Record<string, string[]>,
  skip: number,
  take: number,
): Promise<{ summary: MeasureResult[]; rows: Record<string, unknown>[]; total: number }> {
  const def = OPERATIONAL_REPORTS[key];
  switch (key) {
    case 'event_activity_outcomes': {
      const s = await repo.eventActivityOutcomesSummary(period, filters);
      const r = await repo.eventActivityOutcomesRows(period, filters, skip, take);
      const summary: MeasureResult[] = [
        measure(def, 'total_events', s.totalEvents, wholeScope(s.totalEvents)),
        measure(def, 'completed_events', s.completedEvents, wholeScope(s.completedEvents)),
        measure(def, 'overdue_incomplete_events', s.overdueIncomplete, null),
      ];
      return { summary, rows: r.items, total: r.total };
    }
    case 'training_attendance': {
      const s = await repo.trainingAttendanceSummary(period, filters);
      const r = await repo.trainingAttendanceRows(period, filters, skip, take);
      const summary: MeasureResult[] = [
        measure(def, 'completed_training_count', s.completedTrainingCount, wholeScope(s.completedTrainingCount)),
        measure(
          def,
          'recorded_attendance',
          s.recordedAttendance === null ? null : Number(s.recordedAttendance),
          { known: s.attendanceKnownCount, missing: s.attendanceMissingCount, undated: 0 },
        ),
      ];
      return { summary, rows: r.items, total: r.total };
    }
    case 'programme_activity_coverage': {
      const groups = await repo.programmeActivityCoverage(period, filters);
      const totalEvents = groups.reduce((acc, g) => acc + g.totalEvents, 0);
      const completedEvents = groups.reduce((acc, g) => acc + g.completedEvents, 0);
      const attendance = groups.reduce(
        (acc, g) => (g.attendanceFromCompleted === null ? acc : acc + g.attendanceFromCompleted),
        0,
      );
      const hasAnyAttendance = groups.some((g) => g.attendanceFromCompleted !== null);
      // Districts are counted distinct PER programme (see repository); a global distinct count
      // across programmes would require a further query, so the summary exposes the sum across
      // programme groups as a coverage indicator, not a deduped global figure. Per-programme
      // figures are available verbatim in `rows`.
      const districtsSum = groups.reduce((acc, g) => acc + g.distinctKnownDistricts, 0);
      const summary: MeasureResult[] = [
        measure(def, 'distinct_events', totalEvents, wholeScope(totalEvents)),
        measure(def, 'completed_events', completedEvents, wholeScope(completedEvents)),
        measure(def, 'attendance_from_completed', hasAnyAttendance ? attendance : null, {
          known: groups.filter((g) => g.attendanceFromCompleted !== null).length,
          missing: groups.filter((g) => g.attendanceFromCompleted === null).length,
          undated: 0,
        }),
        measure(def, 'distinct_known_districts', districtsSum, null),
      ];
      const rows = groups.map((g) => ({
        programme_scheme_id: g.programmeSchemeId,
        total_events: g.totalEvents,
        completed_events: g.completedEvents,
        attendance_from_completed: g.attendanceFromCompleted,
        distinct_known_districts: g.distinctKnownDistricts,
      }));
      return { summary, rows: rows.slice(skip, skip + take), total: rows.length };
    }
    case 'district_activity_coverage': {
      const { totalGroups, completedGroups } = await repo.districtActivityCoverage(period, filters);
      const completedByDistrict = new Map(completedGroups.map((g) => [g.districtId ?? 'unknown', g]));
      const rows = totalGroups.map((g) => {
        const districtId = g.districtId ?? 'unknown';
        const completed = completedByDistrict.get(districtId);
        return {
          district_id: g.districtId,
          district_label: g.districtId ?? 'Unknown',
          total_events: g._count._all,
          completed_events: completed?._count._all ?? 0,
          attendance_from_completed: completed?._sum.finalParticipantCount ?? null,
        };
      });
      const totalEvents = rows.reduce((acc, r) => acc + r.total_events, 0);
      const completedEvents = rows.reduce((acc, r) => acc + r.completed_events, 0);
      const attendanceRows = rows.filter((r) => r.attendance_from_completed !== null);
      const attendanceSum = attendanceRows.reduce((acc, r) => acc + (r.attendance_from_completed ?? 0), 0);
      const summary: MeasureResult[] = [
        measure(def, 'distinct_events', totalEvents, wholeScope(totalEvents)),
        measure(def, 'completed_events', completedEvents, wholeScope(completedEvents)),
        measure(def, 'attendance_from_completed', attendanceRows.length ? attendanceSum : null, {
          known: attendanceRows.length,
          missing: rows.length - attendanceRows.length,
          undated: 0,
        }),
      ];
      return { summary, rows: rows.slice(skip, skip + take), total: rows.length };
    }
    case 'toolkit_item_distribution': {
      const s = await repo.toolkitDistributionSummary(period, filters);
      const r = await repo.toolkitDistributionRows(period, filters, skip, take);
      const metaById = new Map(s.itemMeta.map((m) => [m.id, m]));
      const itemRows = s.itemTotals.map((t) => {
        const meta = metaById.get(t.toolkitItemId);
        return {
          toolkit_item_id: t.toolkitItemId,
          name_en: meta?.nameEn ?? null,
          unit: meta?.unit ?? null,
          total_quantity: t._sum.totalQuantity === null ? null : Number(t._sum.totalQuantity),
          row_count: t._count._all,
        };
      });
      const summary: MeasureResult[] = [
        measure(def, 'completed_distributions', s.completedDistributions, {
          known: s.completedDistributions,
          missing: 0,
          undated: s.undatedDistributions,
        }),
        measure(
          def,
          'participants_covered',
          s.participantsCovered === null ? null : Number(s.participantsCovered),
          { known: s.participantsKnownCount, missing: s.participantsMissingCount, undated: s.undatedDistributions },
        ),
        // quantity_by_item_unit is not a single scalar (grouped by item+unit) — value is null and
        // the breakdown is surfaced via `rows`/itemRows only; it is also not publicEligible.
        measure(def, 'quantity_by_item_unit', null, {
          known: s.itemTotals.reduce((acc, t) => acc + t._count._all, 0) - s.itemsMissingQuantity,
          missing: s.itemsMissingQuantity,
          undated: s.undatedDistributions,
        }),
      ];
      return { summary, rows: [...r.items, ...itemRows] as Record<string, unknown>[], total: r.total };
    }
    case 'procurement_register': {
      const s = await repo.procurementRegisterSummary(period, filters);
      const r = await repo.procurementRegisterRows(period, filters, skip, take);
      const summary: MeasureResult[] = [
        measure(def, 'priced_update_count', s.pricedUpdateCount, {
          known: s.pricedUpdateCount,
          missing: 0,
          undated: s.undated,
        }),
        // rate_stats_by_commodity_type_unit is a grouped breakdown, not a scalar — surfaced via
        // `rows`'s group summaries below rather than `value`.
        measure(def, 'rate_stats_by_commodity_type_unit', null, {
          known: s.groups.length,
          missing: 0,
          undated: s.undated,
        }),
      ];
      const groupRows = s.groups.map((g) => ({
        commodity_id: g.commodityId,
        procurement_update_type_id: g.procurementUpdateTypeId,
        unit: g.unit,
        min_rate: g._min.rate === null ? null : Number(g._min.rate),
        max_rate: g._max.rate === null ? null : Number(g._max.rate),
        latest_rate: g.latestRate === null ? null : Number(g.latestRate),
        latest_effective_date: g.latestEffectiveDate,
        latest_is_tied: g.tie,
        update_count: g._count._all,
      }));
      return {
        summary,
        rows: [...r.items, ...groupRows] as Record<string, unknown>[],
        total: r.total,
      };
    }
    default: {
      const _exhaustive: never = key;
      throw new ValidationError({ reportKey: [`Unhandled report key.`] });
    }
  }
}

/**
 * Explicit row-count ceiling for `/export` (XLSX). Chosen to keep the hand-rolled OOXML writer's
 * in-memory string/zip work bounded to something that generates in well under a request timeout.
 * Exceeding it is a 4xx (`PayloadTooLargeError`) telling the caller to narrow period/filters —
 * never a silent truncation of the workbook.
 */
export const EXPORT_ROW_LIMIT = 50_000;

/**
 * Export uses the SAME `computeReport` call used by `/generate` — one consistent read against the
 * current data — just with no pagination (the whole matching result set, up to `EXPORT_ROW_LIMIT`)
 * and its own body validator (`validateExportBody`, no `page`/`pageSize` fields).
 */
async function generateForExport(reportKey: string, body: unknown): Promise<ReportResult> {
  if (!Object.prototype.hasOwnProperty.call(OPERATIONAL_REPORTS, reportKey)) {
    throw new ValidationError({ reportKey: [`Unknown report key "${reportKey}".`] });
  }
  const key = reportKey as ReportKey;
  const input = validateExportBody(key, body);
  const period = await resolvePeriod(input.periodInput);

  // Fetch one row beyond the limit so an over-limit result is detected rather than silently
  // truncated: if exactly `EXPORT_ROW_LIMIT + 1` (or more) rows come back, the true result set is
  // over the ceiling.
  const { summary, rows, total } = await computeReport(key, period, input.filters, 0, EXPORT_ROW_LIMIT + 1);
  if (rows.length > EXPORT_ROW_LIMIT || total > EXPORT_ROW_LIMIT) {
    throw new PayloadTooLargeError(
      `This report has too many rows to export (limit ${EXPORT_ROW_LIMIT}). Narrow the period or filters and try again.`,
    );
  }

  return {
    reportKey: key,
    resolvedPeriod: period,
    filters: input.filters,
    summary,
    rows: { items: rows, total: rows.length, page: 1, pageSize: rows.length },
    calculatedAt: new Date(),
  };
}

function wholeScope(count: number): CompletenessInfo {
  return { known: count, missing: 0, undated: 0 };
}

function measure(
  def: ReportDefinition,
  measureKey: string,
  value: number | null,
  completeness: CompletenessInfo | null,
): MeasureResult {
  const m = def.measures.find((x) => x.key === measureKey);
  if (!m) throw new Error(`Registry is missing measure "${measureKey}" for report "${def.key}".`);
  return {
    key: m.key,
    calculationVersion: m.calculationVersion,
    labelEn: m.labelEn,
    labelHi: m.labelHi,
    unit: m.unit,
    value,
    completeness,
    noteEn: m.noteEn,
    noteHi: m.noteHi,
  };
}

export const operationalReportsService = { listCatalogue, generate, generateForExport };
