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

```http
GET  /api/admin/dashboard-data
POST /api/admin/dashboard-data
POST /api/admin/dashboard-data/upload
```

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

- Admin controls public visibility, display order, reporting period, and data
  upload/update.
- Reports are predefined.
- Dashboard summary may feed homepage headline KPIs.

## Permissions

- Public: public reports only.
- Content Editor: upload/edit dashboard data if granted.
- Publisher/Super Administrator: control public visibility and reporting period.

## Lifecycle Rules

- Dashboard reports are fixed definitions.
- Data may be CMS-derived, manual, or Excel-uploaded.

## Validation

- Uploaded rows must validate reporting period and master references.
- Unknown report keys must be rejected.

## Non-Goals

- User-defined report builder.
- ERP/MIS transaction entry.
- Live analytics in Phase 1.
