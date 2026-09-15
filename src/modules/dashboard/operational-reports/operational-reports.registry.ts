/**
 * The Operational Reports catalogue — the single source of truth for which reports and measures
 * exist, their supported filters/period modes, and (critically) which measures are eligible to be
 * surfaced publicly as a Website Metric (Stage 2 imports THIS module to validate a metric
 * configuration; it never re-derives eligibility itself). Adding/removing a report or measure is a
 * code change and a `calculationVersion` bump — never a data-entry action.
 *
 * Design notes carried over from the plan / spec:
 *  - `training_attendance`'s attendance measure sums `finalParticipantCount` from completed events
 *    only. It is explicitly NOT "unique beneficiaries" — the note says so, and it is publicEligible
 *    with that caveat spelled out for whatever consumes the note.
 *  - `toolkit_item_distribution`'s per-item quantity totals are grouped by item+unit and are NOT
 *    publicEligible as a single combined figure (mixed units); the distinct-events/participants
 *    counts ARE.
 *  - `procurement_register` deliberately has NO "total procurement quantity" measure — the spec
 *    explicitly prohibits summing quantity across units. Only within-unit rate stats are exposed,
 *    and even those are not publicEligible (rates are a snapshot-in-time register concern, not a
 *    stable public KPI) except a defensible "priced update count".
 */
import type { ReportDefinition, ReportKey } from './operational-reports.types';

export const OPERATIONAL_REPORTS: Record<ReportKey, ReportDefinition> = {
  event_activity_outcomes: {
    key: 'event_activity_outcomes',
    titleEn: 'Event Activity & Outcomes',
    titleHi: 'गतिविधि और परिणाम',
    dateBasisField: 'startDate',
    supportedFilters: ['districtId', 'blockId', 'eventTypeId', 'eventStatus'],
    measures: [
      {
        key: 'total_events',
        calculationVersion: 1,
        labelEn: 'Total events (in period)',
        labelHi: 'कुल गतिविधियाँ',
        unit: 'events',
        noteEn: 'Count of events whose start date falls within the resolved period, in scope (published, non-archived).',
        supportedFilters: ['districtId', 'blockId', 'eventTypeId', 'eventStatus'],
        supportedPeriodModes: ['fixed_range', 'financial_year', 'current_financial_year'],
        publicEligible: true,
        completenessRequirement: 'date_basis',
      },
      {
        key: 'completed_events',
        calculationVersion: 1,
        labelEn: 'Completed events',
        labelHi: 'पूर्ण गतिविधियाँ',
        unit: 'events',
        noteEn: 'Count of events with eventStatus = completed within the resolved period.',
        supportedFilters: ['districtId', 'blockId', 'eventTypeId'],
        supportedPeriodModes: ['fixed_range', 'financial_year', 'current_financial_year'],
        publicEligible: true,
        completenessRequirement: 'date_basis',
      },
      {
        key: 'overdue_incomplete_events',
        calculationVersion: 1,
        labelEn: 'Past end date, not marked complete',
        labelHi: 'समाप्ति तिथि बीत चुकी, अपूर्ण',
        unit: 'events',
        noteEn: 'Events whose end date has passed but eventStatus is not completed — an internal data-quality signal, not a public figure.',
        supportedFilters: ['districtId', 'blockId', 'eventTypeId'],
        supportedPeriodModes: ['fixed_range', 'financial_year', 'current_financial_year'],
        publicEligible: false,
        completenessRequirement: 'none',
      },
    ],
  },

  training_attendance: {
    key: 'training_attendance',
    titleEn: 'Training Attendance',
    titleHi: 'प्रशिक्षण उपस्थिति',
    dateBasisField: 'startDate',
    supportedFilters: ['districtId', 'blockId'],
    measures: [
      {
        key: 'completed_training_count',
        calculationVersion: 2,
        labelEn: 'Completed trainings',
        labelHi: 'पूर्ण प्रशिक्षण',
        unit: 'trainings',
        noteEn: 'Count of training events (event type belongs to Capacity Building & Exposure Visits) with eventStatus = completed within the resolved period.',
        supportedFilters: ['districtId', 'blockId'],
        supportedPeriodModes: ['fixed_range', 'financial_year', 'current_financial_year'],
        publicEligible: true,
        completenessRequirement: 'date_basis',
      },
      {
        key: 'recorded_attendance',
        calculationVersion: 2,
        labelEn: 'Recorded attendance',
        labelHi: 'दर्ज उपस्थिति',
        unit: 'attendees',
        noteEn: 'Sum of finalParticipantCount from completed events in Capacity Building & Exposure Visits with a non-null count. This is recorded attendance, NOT a count of unique beneficiaries — a person attending multiple trainings is counted multiple times.',
        supportedFilters: ['districtId', 'blockId'],
        supportedPeriodModes: ['fixed_range', 'financial_year', 'current_financial_year'],
        publicEligible: true,
        completenessRequirement: 'attendance',
      },
    ],
  },

  programme_activity_coverage: {
    key: 'programme_activity_coverage',
    titleEn: 'Programme Activity Coverage',
    titleHi: 'कार्यक्रम गतिविधि कवरेज',
    dateBasisField: 'startDate',
    supportedFilters: ['programmeSchemeId'],
    measures: [
      {
        key: 'distinct_events',
        calculationVersion: 1,
        labelEn: 'Distinct events (per programme)',
        labelHi: 'विशिष्ट गतिविधियाँ',
        unit: 'events',
        noteEn: 'Distinct events linked to the programme scheme within the period (an event linked to a programme via multiple rows is counted once).',
        supportedFilters: ['programmeSchemeId'],
        supportedPeriodModes: ['fixed_range', 'financial_year', 'current_financial_year'],
        publicEligible: true,
        completenessRequirement: 'date_basis',
      },
      {
        key: 'completed_events',
        calculationVersion: 1,
        labelEn: 'Completed events (per programme)',
        labelHi: 'पूर्ण गतिविधियाँ',
        unit: 'events',
        noteEn: 'Distinct events linked to the programme scheme with eventStatus = completed within the period.',
        supportedFilters: ['programmeSchemeId'],
        supportedPeriodModes: ['fixed_range', 'financial_year', 'current_financial_year'],
        publicEligible: true,
        completenessRequirement: 'date_basis',
      },
      {
        key: 'attendance_from_completed',
        calculationVersion: 1,
        labelEn: 'Attendance (completed events)',
        labelHi: 'उपस्थिति (पूर्ण गतिविधियाँ)',
        unit: 'attendees',
        noteEn: 'Sum of finalParticipantCount from the programme\'s completed events with a non-null count. Not unique beneficiaries.',
        supportedFilters: ['programmeSchemeId'],
        supportedPeriodModes: ['fixed_range', 'financial_year', 'current_financial_year'],
        publicEligible: true,
        completenessRequirement: 'attendance',
      },
      {
        key: 'distinct_known_districts',
        calculationVersion: 1,
        labelEn: 'Distinct known districts reached',
        labelHi: 'ज्ञात जिले',
        unit: 'districts',
        noteEn: 'Count of distinct non-null districtId values among the programme\'s events in the period. Events with no district are excluded from this count (see district_activity_coverage for an explicit Unknown group).',
        supportedFilters: ['programmeSchemeId'],
        supportedPeriodModes: ['fixed_range', 'financial_year', 'current_financial_year'],
        publicEligible: true,
        completenessRequirement: 'none',
      },
    ],
  },

  district_activity_coverage: {
    key: 'district_activity_coverage',
    titleEn: 'District Activity Coverage',
    titleHi: 'जिला गतिविधि कवरेज',
    dateBasisField: 'startDate',
    supportedFilters: ['districtId', 'blockId'],
    measures: [
      {
        key: 'distinct_events',
        calculationVersion: 1,
        labelEn: 'Distinct events (per district/block)',
        labelHi: 'विशिष्ट गतिविधियाँ',
        unit: 'events',
        noteEn: 'Count of events per district/block within the period. Events with no district are grouped under an explicit "Unknown" bucket, never dropped silently.',
        supportedFilters: ['districtId', 'blockId'],
        supportedPeriodModes: ['fixed_range', 'financial_year', 'current_financial_year'],
        publicEligible: true,
        completenessRequirement: 'date_basis',
      },
      {
        key: 'completed_events',
        calculationVersion: 1,
        labelEn: 'Completed events (per district/block)',
        labelHi: 'पूर्ण गतिविधियाँ',
        unit: 'events',
        noteEn: 'Count of eventStatus = completed events per district/block within the period, including an "Unknown" bucket for null district.',
        supportedFilters: ['districtId', 'blockId'],
        supportedPeriodModes: ['fixed_range', 'financial_year', 'current_financial_year'],
        publicEligible: true,
        completenessRequirement: 'date_basis',
      },
      {
        key: 'attendance_from_completed',
        calculationVersion: 1,
        labelEn: 'Attendance (completed events, per district/block)',
        labelHi: 'उपस्थिति',
        unit: 'attendees',
        noteEn: 'Sum of finalParticipantCount from completed events per district/block, non-null only. Not unique beneficiaries.',
        supportedFilters: ['districtId', 'blockId'],
        supportedPeriodModes: ['fixed_range', 'financial_year', 'current_financial_year'],
        publicEligible: true,
        completenessRequirement: 'attendance',
      },
    ],
  },

  toolkit_item_distribution: {
    key: 'toolkit_item_distribution',
    titleEn: 'Toolkit Item Distribution',
    titleHi: 'टूलकिट वितरण',
    dateBasisField: 'distributionDate',
    supportedFilters: ['toolkitId', 'districtId'],
    measures: [
      {
        key: 'completed_distributions',
        calculationVersion: 1,
        labelEn: 'Completed distributions',
        labelHi: 'पूर्ण वितरण',
        unit: 'distributions',
        noteEn: 'Count of ToolkitDistributionSummary rows with distributionDone = true within the period. Deduplicated by summary id — never counted per item.',
        supportedFilters: ['toolkitId', 'districtId'],
        supportedPeriodModes: ['fixed_range', 'financial_year', 'current_financial_year'],
        publicEligible: true,
        completenessRequirement: 'date_basis',
      },
      {
        key: 'participants_covered',
        calculationVersion: 1,
        labelEn: 'Participants covered',
        labelHi: 'शामिल प्रतिभागी',
        unit: 'participants',
        noteEn: 'Sum of participantsCovered across completed distribution summaries in the period, non-null only. Counted once per summary, never per item.',
        supportedFilters: ['toolkitId', 'districtId'],
        supportedPeriodModes: ['fixed_range', 'financial_year', 'current_financial_year'],
        publicEligible: true,
        completenessRequirement: 'attendance',
      },
      {
        key: 'quantity_by_item_unit',
        calculationVersion: 1,
        labelEn: 'Quantity distributed (by item + unit)',
        labelHi: 'वितरित मात्रा',
        unit: null,
        noteEn: 'Sum of ToolkitDistributionItem.totalQuantity grouped by toolkit item and its unit. Never combined across items/units into one figure; rows missing quantity or unit are flagged separately.',
        supportedFilters: ['toolkitId', 'districtId'],
        supportedPeriodModes: ['fixed_range', 'financial_year', 'current_financial_year'],
        publicEligible: false,
        completenessRequirement: 'quantity_and_unit',
      },
    ],
  },

  procurement_register: {
    key: 'procurement_register',
    titleEn: 'Procurement Register',
    titleHi: 'खरीद रजिस्टर',
    dateBasisField: 'effectiveDate',
    supportedFilters: ['commodityId', 'procurementUpdateTypeId', 'districtId'],
    measures: [
      {
        key: 'priced_update_count',
        calculationVersion: 1,
        labelEn: 'Priced update count',
        labelHi: 'मूल्य अद्यतन गणना',
        unit: 'updates',
        noteEn: 'Count of procurement updates with a non-null rate within the period. Never implies a total quantity or a single blended rate.',
        supportedFilters: ['commodityId', 'procurementUpdateTypeId', 'districtId'],
        supportedPeriodModes: ['fixed_range', 'financial_year', 'current_financial_year'],
        publicEligible: false,
        completenessRequirement: 'date_basis',
      },
      {
        key: 'rate_stats_by_commodity_type_unit',
        calculationVersion: 1,
        labelEn: 'Rate min/max/latest (by commodity + update type + unit)',
        labelHi: 'दर सांख्यिकी',
        unit: null,
        noteEn: 'Min, max, and latest (greatest effectiveDate; ties flagged) rate per commodity + procurement update type + unit group. Rates are never compared or averaged across different units. No overall procurement quantity total is ever produced.',
        supportedFilters: ['commodityId', 'procurementUpdateTypeId', 'districtId'],
        supportedPeriodModes: ['fixed_range', 'financial_year', 'current_financial_year'],
        publicEligible: false,
        completenessRequirement: 'date_basis',
      },
    ],
  },
};

export function getReportDefinition(key: string): ReportDefinition | undefined {
  return OPERATIONAL_REPORTS[key as ReportKey];
}

export function isReportKey(key: string): key is ReportKey {
  return Object.prototype.hasOwnProperty.call(OPERATIONAL_REPORTS, key);
}

export const REPORT_KEYS = Object.keys(OPERATIONAL_REPORTS) as ReportKey[];
