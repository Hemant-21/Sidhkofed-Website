# 15 Dashboard API

## Purpose

Expose fixed public dashboard reports using CMS-derived data where possible and
manual/Excel summary data where required.

## Public Endpoints

```http
GET /api/dashboard
GET /api/dashboard/{report-key}
```

## Admin Endpoints

Manual dashboard-data entry/upload (`GET`/`POST /api/admin/dashboard-data`,
`POST /api/admin/dashboard-data/upload`) has been retired (Stage 7 of the
Operational Reports / Website Metrics cutover) and fully removed from the
implementation — see `src/modules/dashboard/dashboard.routes.ts`. Manual
metric entry and Excel/CSV dataset import are superseded by Operational
Reports and Website Metrics. Only report-definition admin endpoints
(create/list/detail/patch + publish/unpublish/archive/restore) remain.

## Fixed Report Keys

- `procurement-summary`
- `training-summary`
- `beneficiaries-reached`
- `activities-events-summary`
- `district-coverage`
- `commodity-wise-activities`
- `commodity-wise-toolkit-distribution`
- `programme-scheme-coverage`
- `partnerships-mous`
- `sidhkofed-primary-membership`
- `sidhkofed-nominal-membership`
- `du-primary-membership`
- `du-nominal-membership`

## Report Response Shape

```json
{
  "report_key": "",
  "title_en": "",
  "title_hi": null,
  "reporting_period": "",
  "updated_at": "",
  "data": [],
  "source": "cms|manual|excel"
}
```

## Filters

```http
?period=fy-2026-27
?district=gumla
?commodity=lac
?programme=scheme-code
```

## Rules

- Admin controls public visibility, display order, and reporting period on
  the fixed report definitions.
- Reports are predefined.
- Dashboard summary may feed homepage headline KPIs.
- The underlying `DashboardMetric`/`DashboardDataset` figures are no longer
  admin-editable; they are populated (if at all) by other means — see
  Operational Reports / Website Metrics.

## Permissions

- Public: public reports only.
- Publisher/Super Administrator: control public visibility and reporting period.

## Lifecycle Rules

- Dashboard reports are fixed definitions.

## Validation

- Unknown report keys must be rejected.

## Non-Goals

- User-defined report builder.
- ERP/MIS transaction entry.
- Live analytics in Phase 1.
