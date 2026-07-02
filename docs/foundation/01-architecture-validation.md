# 1. Architecture Validation Report

> Verifies internal consistency across the four frozen documents. **This is an
> audit, not a redesign.** Where the documents differ, the resolution is always
> "apply the precedence order," and each item below records the decision so the
> implementation does not have to re-litigate it.

Scope of checks:

- **A — Schema ↔ API alignment** (every endpoint is backed by an existing table/field)
- **B — API ↔ build-context alignment** (envelope, namespaces, lifecycle, non-goals)
- **C — Conflicting contracts** (naming/enum/field divergences) + resolution

Legend: ✅ consistent · ⚠️ reconciled (naming/precedence) · ❌ true conflict (none found)

---

## A. Schema ↔ API alignment

The API spec (§9 OpenAPI readiness, Part 14 of the schema doc) already asserts
"no endpoint requires a new database entity." Independent verification:

| API surface | Backing schema object(s) | Result |
|---|---|---|
| `auth/login,refresh,logout,me` | `users`, `roles`, `permissions`, `user_roles`, `role_permissions` | ✅ |
| Shared **P** lifecycle (`publish/unpublish/archive/restore`) | publishing-workflow mixin on every content model | ✅ |
| `admin/masters/{key}` + activate/deactivate | all master tables share `is_active`, `slug`, `name_en` | ✅ |
| Events create/detail + `dynamic_values` | `events` + `event_field_definitions` (validated JSONB) | ✅ |
| `events/{id}/publish-as-news`, `admin/news` | `event_news` (own slug + mixin) | ✅ |
| `event-types/{id}/field-definitions` | `event_field_definitions` (`field_key,data_type,options,...`) | ✅ |
| Programmes / toolkits / institutions / documents / communications / tenders / procurement / stories | matching content tables + junctions | ✅ |
| `toolkits/{slug}/distribution-summary` | `toolkit_distribution_summaries` + `toolkit_distribution_items` | ✅ |
| `events/{id}/toolkit-distributions` items | `toolkit_distribution_items` (auto `total_quantity` rule) | ✅ |
| `documents/{id}/replace-file` | `documents.file_asset_id` swap + `media_usages` + audit | ✅ |
| Pages / menus / FAQs / digital-services / memberships | matching tables; menu self-ref `parent_id` | ✅ |
| Memberships `bulk-upload` | `institutional_memberships` (in-memory parse, no new entity) | ✅ |
| Enquiries submit + admin notes/archive/export | `enquiries` (`source_ip_hash`, `spam_state`, `archived_at`) | ✅ |
| Media upload/bulk/replace/usages | `media_assets`, `media_usages`, `replaced_by_id` chain | ✅ |
| Galleries + images, Videos | `galleries`, `gallery_images`, `videos` | ✅ |
| Dashboard reports/metrics/datasets/upload | `dashboard_reports`, `dashboard_metrics`, `dashboard_datasets` | ✅ |
| Users / settings / audit-logs | `users`, `settings`, `audit_logs` | ✅ |
| `public/search` (9 content types) | per-table `search_vector` GIN (FTS migration) | ✅ |
| `public/home`, `public/dashboard/kpis` | aggregation over `show_on_homepage` + `highlight_*` | ✅ |

**Field-level spot checks** (all pass):

- `publish-as-news` body (`title/summary/body_en/hi, cover_media_id, news_published_at, ...`) ↔ `event_news` columns. ✅
- Document create (`document_type_id, file_asset_id, language, knowledge_category_id, financial_year_id, *_ids`) ↔ `documents` + 5 junctions. ✅
- Dashboard metric "exactly one of `value`/`value_text`" ↔ both nullable columns + `@@unique([report_id, metric_key, financial_year_id, reporting_period_id])`. ✅
- Membership two-axis (`membership_level` × `membership_type`) feeding reports #10–#13 ↔ `@@index([membership_level, membership_type, reporting_period_id])`. ✅

**Conclusion A:** Schema fully backs the API. No missing entity, field, or junction.

---

## B. API ↔ build-context alignment

| Build-context guardrail (master/codex) | API spec realization | Result |
|---|---|---|
| One mandatory envelope `{success,data/pagination,error,meta}` | §1.4, used everywhere incl. Appendix A | ✅ |
| `snake_case` fields, `kebab-case` paths, UUIDs | §0 intro | ✅ |
| Pagination `page_size=20`, cap `100` | §1.4 | ✅ |
| Public = published + visible + not archived + due | §1.3 visibility predicate; schema Part 10 rule #4 | ✅ |
| Explicit lifecycle endpoints (no PATCH state change) | §1.3, §3 | ✅ |
| Stable immutable slug; super-admin-only override (audited) | §1.3 | ✅ |
| Knowledge Hub requires explicit tag, not `is_public` | `knowledge_centre=true ⇒ show_in_knowledge_centre=true` (§5) | ✅ |
| Expiry never auto-unpublishes | communications/tenders "expiry informational" (§5/§6) | ✅ |
| ≤3 homepage videos | enforced at publish, `409` if exceeded (§6) | ✅ |
| Enquiries text-only, one recipient, Excel export only | §6 enquiries; export-only endpoint | ✅ |
| Non-goals (no ERP/registration/PDF-index/video hosting) | §9 explicitly excludes them | ✅ |
| RBAC: 3 roles, permission-checked endpoints | §1.2 + §8 RBAC matrix | ✅ |
| Scheduler: publishing, status, highlight expiry, thumbnails | §3 scheduler note; schema Part 10 | ✅ |

**Namespace note (reconciled, not a conflict):** the codex requirements (§15) and
master-build-context (§10.3) list **suggested** endpoints as `/api/events`, while the
API spec mandates `/api/v1/public/events`. The codex labels its list "Suggested,"
and the API spec is precedence #3 and the *implementation contract*; it explicitly
states legacy `/api/*` are redirect/proxy only. **Decision: implement only
`/api/v1/{public|admin|auth}/*`.** ⚠️ (reconciled by precedence)

**Conclusion B:** The API contract faithfully implements every build-context rule and non-goal.

---

## C. Naming / enum reconciliations (resolve once, here)

These are the only divergences found. None is a logical conflict; each is a label
difference between the requirements doc and the schema/API layer. **The schema +
API spelling is authoritative for implementation** (it is what the running system
filters/stores), and the mapping to the requirements wording is 1:1.

| # | Requirements (codex) wording | Schema / API canonical | Decision |
|---|---|---|---|
| C1 | event auto-status `upcoming` | enum `scheduled` (`event_status_enum`) | Store/transport `scheduled`; public UI label may read "Upcoming". Map `upcoming ⇄ scheduled`. ⚠️ |
| C2 | `date_mode`: `single_date \| date_range` | `single \| range \| multi_day` | Use `single/range/multi_day`; `multi_day` is an additive third mode. ⚠️ |
| C3 | enquiry `is_spam` (boolean) | `spam_state` enum `clean\|suspected\|spam` | Use `spam_state` (richer; supports "suspected" triage). ⚠️ |
| C4 | membership `membership_date` | `join_date` | Use `join_date`. ⚠️ |
| C5 | tender `publishing_date` | `publish_date` | Use `publish_date`. ⚠️ |
| C6 | highlight set excludes `Featured` in §4.6, includes it in §9 | `new\|latest\|important\|urgent\|featured` | Use the §9 common model (with `featured`); stored lower-case. ⚠️ |
| C7 | enum casing shown UPPER (`SIDHKOFED`, `NEW`) | lower-case members (`sidhkofed`, `new`) | Lower-case everywhere (transport + storage); case is the only difference. ⚠️ |
| C8 | programme/toolkit "connect commodity+programme" (AC#8) | `programme_scheme_id`/`commodity_id` nullable on `toolkits` | Nullable allows draft authoring; the linkage is supported, not mandatory at create. ✅ (intentional) |

**Enum-casing rule (project-wide):** all enum values are lower-case `snake_case`
members in DB, Prisma, JSON payloads, and query filters. The UPPER-case forms in the
requirements are display/spec notation only.

**Open decision flagged in the schema (carry forward):** `district_union_id` on
`institutional_memberships` currently references `institutions`. The schema asks to
*confirm before seeding* whether District Unions deserve a dedicated `district_unions`
master. This is a seeding-time decision, not a blocker; **do not** collapse the two
membership axes into one field regardless of the choice. (Owner: data lead.)

---

## Validation verdict

- **A. Schema ↔ API:** ✅ fully aligned — every endpoint maps to existing tables/fields.
- **B. API ↔ build-context:** ✅ all guardrails and non-goals honored.
- **C. Conflicts:** ❌ none structural. 8 cosmetic/naming items reconciled above; 1 seeding decision deferred to the data lead.

The documents are internally consistent and safe to build against. Implementation
must use the schema/API canonical spellings recorded in §C and treat §C as the
single place those mappings are decided.
