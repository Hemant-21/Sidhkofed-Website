# 12 Institutional Memberships API

## Purpose

Expose institution-wise membership records. Do not store individual beneficiary
membership here.

## Public Endpoints

```http
GET /api/memberships
GET /api/memberships/{id}
```

## Admin Endpoints

```http
GET   /api/admin/memberships
POST  /api/admin/memberships
GET   /api/admin/memberships/{id}
PATCH /api/admin/memberships/{id}
POST  /api/admin/memberships/bulk-upload
```

## List Fields

- `id`
- `institution_name`
- `membership_level`
- `membership_type`
- `district`
- `status`
- `public_visibility`
- `display_order`

## Detail Fields

- list fields
- `district_union`
- `membership_date`
- `reporting_period`

## Create / Update Payload

- `institution_name`
- `membership_level`
- `membership_type`
- `district_id`
- `district_union_id`
- `membership_date`
- `status`
- `public_visibility`
- `display_order`
- `reporting_period_id`

## Filters

```http
?membership_level=sidhkofed
?membership_type=primary
?district=ranchi
?status=active
```

## Permissions

- Public: records with `public_visibility = true`.
- Content Editor: create/edit membership records.
- Publisher/Super Administrator: publish/archive if lifecycle is implemented.

## Lifecycle Rules

- Membership records support public visibility and display ordering.
- Bulk upload may be supported for institutional records.

## Validation

- `membership_level`, `membership_type`, and `district_id` are required.
- `district_union_id` is required when the record belongs to a district union.

## Non-Goals

- Individual member/beneficiary records.
- Voting, dividend, or membership transaction workflows.
