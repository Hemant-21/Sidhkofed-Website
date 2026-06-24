# 04 Toolkits API

## Purpose

Expose toolkit definitions and public-facing toolkit distribution summaries.
This is not inventory management.

## Public Endpoints

```http
GET /api/toolkits
GET /api/toolkits/{id}
GET /api/events/{id-or-slug}/toolkit-summary
```

## Admin Endpoints

```http
GET   /api/admin/toolkits
POST  /api/admin/toolkits
GET   /api/admin/toolkits/{id}
PATCH /api/admin/toolkits/{id}
POST  /api/admin/toolkits/{id}/activate
POST  /api/admin/toolkits/{id}/deactivate
POST  /api/admin/events/{id}/toolkit-summary
PATCH /api/admin/events/{id}/toolkit-summary
```

## List Fields

- `id`
- `name_en`
- `name_hi`
- `programme_scheme`
- `commodity`
- `is_active`

## Detail Fields

- toolkit fields
- `items`
- linked programme/scheme
- linked commodity

## Create / Update Payload

Toolkit:

- `name_en`
- `name_hi`
- `programme_scheme_id`
- `commodity_id`
- `is_active`
- `description`

Toolkit item:

- `toolkit_id`
- `item_name`
- `distribution_basis`
- `default_quantity_per_unit`
- `default_group_size`
- `unit`
- `display_order`
- `is_active`

Distribution summary:

- `event_id`
- `toolkit_id`
- `distribution_done`
- `distribution_model`
- `participants_covered`
- `distribution_date`
- `remarks`
- `item_summaries`

## Filters

```http
?programme=scheme-code
?commodity=lac
?is_active=true
```

## Permissions

- Public: active/public toolkit summaries only.
- Content Editor: create/edit toolkit definitions and event-level summaries.
- Publisher/Super Administrator: activate/deactivate toolkit records.

## Lifecycle Rules

- Toolkit and item records are activated/deactivated.
- Historical event summaries remain valid if a toolkit is later deactivated.

## Validation

- No duplicate active item name within the same toolkit.
- `default_group_size` is required for group-based default calculations.
- Manual override is allowed for total quantities.

## Non-Goals

- Stock ledger.
- Inventory tracking.
- Beneficiary-wise distribution records.
- Acknowledgement tracking.
