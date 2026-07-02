# SIDHKOFED CMS — Critical Fixes (Pre-Development Remediation)

> **Status:** Proposed corrections for the four **Critical/High** defects found in the
> cross-document audit. Apply these to `database-schema-design.md` (Prisma) and
> `api-specification.md` before backend development starts. Each fix cites the
> authoritative requirement in `sidhkofed-cms-codex-context.md`.
>
> Defects addressed:
> 1. Institutional Membership classification (spec §4.15, AC#18, dashboard #10–13)
> 2. Toolkit programme link + individual/group distribution + per-event summary (spec §4.3, AC#8/#9)
> 3. Search FTS scope vs advertised `content_type` (spec §14)
> 4. Highlight value set (spec §9, §4.6)

---

## Fix 1 — Highlight enum

**Defect:** schema `HighlightType { featured breaking spotlight none }` contradicts the
spec value set `New, Latest, Important, Urgent, Featured`. `null` represents "no highlight"
(the mixin column is already nullable), so a `none` member is unnecessary.

### Prisma

```prisma
// REPLACE
// enum HighlightType { featured breaking spotlight none }

enum HighlightType {
  new
  latest
  important
  urgent
  featured
}
```

The publishing-workflow mixin column stays nullable; clear `highlight_type` (set NULL) to
remove a highlight. No `none` sentinel.

### Migration (only needed if the old enum was already created)

```sql
ALTER TYPE "HighlightType" RENAME TO "HighlightType_old";
CREATE TYPE "HighlightType" AS ENUM ('new','latest','important','urgent','featured');
-- map any legacy rows, then:
-- ALTER TABLE <each content table> ALTER COLUMN highlight_type TYPE "HighlightType"
--   USING (CASE highlight_type::text WHEN 'spotlight' THEN 'important'
--                                    WHEN 'breaking'  THEN 'urgent'
--                                    WHEN 'none'      THEN NULL
--                                    ELSE highlight_type::text END)::"HighlightType";
DROP TYPE "HighlightType_old";
```

### API note (api-specification.md §3 / Appendix)

State the allowed set explicitly so the CMS form renders a correct dropdown:

> `highlight_type` ∈ `new | latest | important | urgent | featured` (omit/null = no highlight).
> Highlight activity is gated by `highlight_start_at`/`highlight_end_at`; the scheduler clears
> the label on expiry and never unpublishes the record.

---

## Fix 2 — Institutional Membership (two-axis classification + reporting)

**Defect:** a single `membership_class ∈ {primary, nominal, sidhkofed_du}` cannot distinguish
SIDHKOFED-Primary from DU-Primary, and omits district, district-union, reporting period, and
status. This makes dashboard reports #10–#13 impossible and violates AC#18.

### Prisma

```prisma
enum MembershipLevel { sidhkofed district_union }   // SIDHKOFED | District Union
enum MembershipType  { primary nominal }
enum MembershipStatus { active inactive }

model InstitutionalMembership {
  id                 String  @id @default(uuid()) @db.Uuid
  institutionId      String  @map("institution_id") @db.Uuid

  // two orthogonal axes (was: single membershipClass)
  membershipLevel    MembershipLevel @map("membership_level")
  membershipType     MembershipType  @map("membership_type")

  membershipNumber   String? @map("membership_number")
  districtId         String? @map("district_id") @db.Uuid          // geographic district
  districtUnionId    String? @map("district_union_id") @db.Uuid    // the DU institution (when level=district_union)
  reportingPeriodId  String? @map("reporting_period_id") @db.Uuid
  status             MembershipStatus @default(active)
  joinDate           DateTime? @map("join_date") @db.Date
  notesEn            String? @map("notes_en")
  notesHi            String? @map("notes_hi")
  // + publishing-workflow mixin (slug, publication_state, public_visibility, display_order, audit FKs, timestamps)

  institution     Institution      @relation("MembershipInstitution", fields: [institutionId], references: [id], onDelete: Restrict)
  districtUnion   Institution?     @relation("MembershipDistrictUnion", fields: [districtUnionId], references: [id], onDelete: Restrict)
  district        District?        @relation(fields: [districtId], references: [id], onDelete: Restrict)
  reportingPeriod ReportingPeriod? @relation(fields: [reportingPeriodId], references: [id])

  @@index([publicationState, publicVisibility, archivedAt, publishedAt])
  @@index([membershipLevel, membershipType, reportingPeriodId])   // powers reports #10–#13
  @@map("institutional_memberships")
}
```

> **DU modeling decision:** `district_union_id` references `Institution` (a District Union is an
> organisation already represented as an `Institution`). If DUs should instead be a dedicated
> master, introduce a `district_unions` table and repoint the FK — but **do not** fold the level
> back into a single field. Confirm this choice before seeding.

### Back-relations to add

```prisma
// model Institution
  memberships        InstitutionalMembership[] @relation("MembershipInstitution")
  duMemberships      InstitutionalMembership[] @relation("MembershipDistrictUnion")

// model District
  institutionalMemberships InstitutionalMembership[]

// model ReportingPeriod
  institutionalMemberships InstitutionalMembership[]
```

### API change (api-specification.md §6 → "Memberships")

```
| Memberships | **P** /admin/memberships; create requires institution_id, membership_level
  in (sidhkofed|district_union), membership_type in (primary|nominal). Accept membership_number,
  district_id, district_union_id (required when level=district_union), reporting_period_id,
  status, join_date, bilingual notes. POST /admin/memberships/bulk-upload accepts CSV/XLSX with
  those same fields, validates every row before one transaction, returns
  {created_count,skipped_count,errors:[{row,fields}]}. |
```

Public (api-specification.md §5):

```
| Memberships | GET /public/memberships, GET /public/memberships/{slug}.
  Filters: institution, membership_level, membership_type, district, reporting_period, year;
  ordering display_order,join_date. | Institutional directory only; no personal/voting/dividend data. |
```

Dashboard reports #10–#13 are then derived as
`count(memberships WHERE level=? AND type=? AND reporting_period=?)`.

---

## Fix 3 — Toolkit programme link + individual/group distribution + per-event summary

**Defect:** `toolkits` has no `programme_scheme_id` (AC#8); `toolkit_items` has only
`quantity_summary` with no `distribution_basis`/group sizing (AC#9); and the spec's
**training-level** distribution summary (per `event_id`+`toolkit_id`) does not exist — the API
reinterpreted it as a sum of item quantities.

### Prisma — Toolkit + ToolkitItem

```prisma
enum DistributionBasis { individual group }
enum DistributionModel { individual group mixed }

model Toolkit {
  // ... existing fields ...
  programmeSchemeId String? @map("programme_scheme_id") @db.Uuid   // ADD (AC#8)
  commodityId       String? @map("commodity_id") @db.Uuid

  programmeScheme ProgrammeScheme? @relation(fields: [programmeSchemeId], references: [id])
  commodity       Commodity?       @relation(fields: [commodityId], references: [id])
  items           ToolkitItem[]
  distributions   ToolkitDistributionSummary[]
  // ... mixin/relations unchanged ...
  @@map("toolkits")
}

model ToolkitItem {
  id                   String  @id @default(uuid()) @db.Uuid
  toolkitId            String  @map("toolkit_id") @db.Uuid
  nameEn               String  @map("name_en")
  nameHi               String? @map("name_hi")
  descriptionEn        String? @map("description_en")
  descriptionHi        String? @map("description_hi")
  unit                 String?
  distributionBasis    DistributionBasis @default(individual) @map("distribution_basis")  // ADD (AC#9)
  defaultQuantityPerUnit Decimal? @map("default_quantity_per_unit") @db.Decimal(14,2)     // ADD
  defaultGroupSize     Int?     @map("default_group_size")                                 // ADD (group basis)
  quantitySummary      Decimal? @map("quantity_summary") @db.Decimal(14,2)                 // catalogue-level summary (kept)
  isActive             Boolean  @default(true) @map("is_active")                           // ADD
  displayOrder         Int      @default(0) @map("display_order")
  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @updatedAt @map("updated_at")
  toolkit Toolkit @relation(fields: [toolkitId], references: [id], onDelete: Cascade)
  distributionItems ToolkitDistributionItem[]
  @@map("toolkit_items")
}
```

Add back-relation `toolkits Toolkit[]` to `ProgrammeScheme`.

### Prisma — per-event (training-level) distribution summary (spec §4.3)

```prisma
model ToolkitDistributionSummary {
  id                 String  @id @default(uuid()) @db.Uuid
  eventId            String  @map("event_id") @db.Uuid
  toolkitId          String  @map("toolkit_id") @db.Uuid
  distributionDone   Boolean @default(false) @map("distribution_done")
  distributionModel  DistributionModel @map("distribution_model")   // individual | group | mixed
  participantsCovered Int?   @map("participants_covered")
  distributionDate   DateTime? @map("distribution_date") @db.Date
  remarksEn          String? @map("remarks_en")
  remarksHi          String? @map("remarks_hi")
  createdById        String  @map("created_by") @db.Uuid
  updatedById        String  @map("updated_by") @db.Uuid
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")
  event   Event   @relation(fields: [eventId], references: [id], onDelete: Cascade)
  toolkit Toolkit @relation(fields: [toolkitId], references: [id], onDelete: Restrict)
  items   ToolkitDistributionItem[]
  @@unique([eventId, toolkitId])
  @@index([toolkitId])
  @@map("toolkit_distribution_summaries")
}

model ToolkitDistributionItem {
  id                 String  @id @default(uuid()) @db.Uuid
  summaryId          String  @map("summary_id") @db.Uuid
  toolkitItemId      String  @map("toolkit_item_id") @db.Uuid
  distributionBasis  DistributionBasis @map("distribution_basis")
  quantityPerUnit    Decimal? @map("quantity_per_unit") @db.Decimal(14,2)
  numberOfUnitsOrGroups Int?  @map("number_of_units_or_groups")
  totalQuantity      Decimal? @map("total_quantity") @db.Decimal(14,2)   // may be auto-computed
  manualOverride     Boolean @default(false) @map("manual_override")     // total entered manually
  summary     ToolkitDistributionSummary @relation(fields: [summaryId], references: [id], onDelete: Cascade)
  toolkitItem ToolkitItem @relation(fields: [toolkitItemId], references: [id], onDelete: Restrict)
  @@unique([summaryId, toolkitItemId])
  @@map("toolkit_distribution_items")
}
```

Add back-relation `toolkitDistributions ToolkitDistributionSummary[]` to `Event`.

**Calculation rule (service layer):** when `manual_override=false` and basis=`group`,
`total_quantity = quantity_per_unit * number_of_units_or_groups`. **No beneficiary-level rows,
no stock ledger, no acknowledgements** (non-goal preserved).

### API changes (api-specification.md §6)

Toolkit base — add programme link:

```
| **P** /admin/toolkits | title_en | bilingual text, programme_scheme_id, commodity_id, cover. Items + distributions managed separately. |
| /admin/toolkits/{toolkit_id}/items | name_en | GET,POST; GET,PATCH,DELETE on {item_id}. Accept description, unit, distribution_basis (individual|group), default_quantity_per_unit, default_group_size, non-negative quantity_summary, is_active, display order. |
```

Per-event distribution summary (NEW admin endpoints):

```
GET|POST  /admin/events/{event_id}/toolkit-distributions
GET|PATCH|DELETE /admin/events/{event_id}/toolkit-distributions/{id}
  body: { toolkit_id, distribution_done, distribution_model (individual|group|mixed),
          participants_covered, distribution_date, remarks_en/hi,
          items:[{ toolkit_item_id, distribution_basis, quantity_per_unit,
                   number_of_units_or_groups, total_quantity, manual_override }] }
```

Redefine the public summary endpoint so it reflects real distribution (not a catalogue sum):

```
| Toolkits | GET /public/toolkits, GET /public/toolkits/{slug},
  GET /public/toolkits/{slug}/distribution-summary |
  Detail includes ordered toolkit_items. The summary endpoint aggregates published
  ToolkitDistributionSummary rows for the toolkit and returns
  {toolkit, distribution_model_breakdown, total_participants_covered,
   items:[{id,name_en,unit,distribution_basis,total_quantity}], total_quantity}
  — summary figures only, never beneficiary-level data. |
```

---

## Fix 4 — Search FTS scope

**Defect:** spec §14 requires search over **events, news, documents, communications, tenders,
programmes/schemes, success stories, pages** (metadata only). The schema builds `search_vector`
on only 5 tables (events, documents, official_communications, procurement_updates,
success_stories). The API advertises **13** `content_type`s — 8 of which have no backing vector.

### Two-part decision

1. **Add FTS** for the four required-but-missing types: `event_news`, `programme_schemes`,
   `tenders`, `pages`.
2. **Trim** the advertised `content_type` list to only entities with a real `search_vector`.
   `procurement_update` is already indexed (keep). Drop `faq`, `digital_service`, `video`,
   `gallery` from search **unless** you also add vectors for them — they are not in the spec's
   search scope, so dropping is the conformant choice.

### Migration SQL (append to the metadata-FTS migration)

```sql
-- event_news
ALTER TABLE event_news
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig,
      coalesce(title_en,'') || ' ' || coalesce(title_hi,'') || ' ' ||
      coalesce(summary_en,'') || ' ' || coalesce(summary_hi,'') || ' ' ||
      coalesce(body_en,'') || ' ' || coalesce(body_hi,''))
  ) STORED;
CREATE INDEX event_news_search_vector_gin_idx ON event_news USING GIN (search_vector);

-- programme_schemes
ALTER TABLE programme_schemes
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig,
      coalesce(title_en,'') || ' ' || coalesce(title_hi,'') || ' ' ||
      coalesce(summary_en,'') || ' ' || coalesce(summary_hi,'') || ' ' ||
      coalesce(description_en,'') || ' ' || coalesce(description_hi,''))
  ) STORED;
CREATE INDEX programme_schemes_search_vector_gin_idx ON programme_schemes USING GIN (search_vector);

-- tenders
ALTER TABLE tenders
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig,
      coalesce(title_en,'') || ' ' || coalesce(title_hi,'') || ' ' ||
      coalesce(summary_en,'') || ' ' || coalesce(summary_hi,'') || ' ' ||
      coalesce(tender_number,''))
  ) STORED;
CREATE INDEX tenders_search_vector_gin_idx ON tenders USING GIN (search_vector);

-- pages
ALTER TABLE pages
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple'::regconfig,
      coalesce(title_en,'') || ' ' || coalesce(title_hi,'') || ' ' ||
      coalesce(body_en,'') || ' ' || coalesce(body_hi,''))
  ) STORED;
CREATE INDEX pages_search_vector_gin_idx ON pages USING GIN (search_vector);
```

> PDF/file bodies remain out of scope (Phase 1 non-goal preserved). `search_vector` stays out of
> the Prisma models; query via parameterized `$queryRaw`, always re-applying the
> published/visible/not-archived/schedule-due predicate per table.

### API change (api-specification.md §5)

```
GET /public/search?q= accepts content_type, commodity, district, programme, year, page, page_size.
content_type is one or more of:
  event, news, programme, document, official_communication, tender, procurement_update,
  success_story, page
Result fields: content_type,id,slug,title_en,title_hi,summary,publication_date,cover_media,public_url
```

(Removed `faq, digital_service, video, gallery` — not in spec search scope and unbacked. If they
are later wanted, add `search_vector` columns first, then re-add them here.)

---

## Application checklist

- [ ] Update `HighlightType` enum + run enum migration; update CMS highlight dropdown to 5 values.
- [ ] Migrate `institutional_memberships` to `membership_level` + `membership_type` (+ district/DU/reporting_period/status); update membership admin/public/bulk-upload APIs; wire dashboard reports #10–#13.
- [ ] Add `toolkits.programme_scheme_id`; extend `toolkit_items`; add `toolkit_distribution_summaries` + `toolkit_distribution_items`; add per-event distribution endpoints; redefine public distribution-summary response.
- [ ] Add `search_vector` to event_news/programme_schemes/tenders/pages; trim `content_type` list.
- [ ] Update `database-schema-design.md` Part 6/7/8 and `api-specification.md` §5/§6 to match.
- [ ] Re-run the traceability matrix rows for Membership, Toolkit, Search, Highlight → expect ✅.

---

# Medium-tier fixes (drafted — not yet folded into canonical docs)

> Status of the four Critical fixes above: **applied** to `database-schema-design.md` and
> `api-specification.md`. The fixes below are **proposed**; apply after sign-off.

## M1 — Event completion fields (spec §4.1 "Event completion fields")

Post-completion fields are described as standard, not dynamic, and should be first-class columns
(not buried in `dynamic_values`) so listings/reports can read them.

```prisma
// model Event — add:
  outcomeSummaryEn      String? @map("outcome_summary_en")
  outcomeSummaryHi      String? @map("outcome_summary_hi")
  keyHighlights         String? @map("key_highlights")
  finalParticipantCount Int?    @map("final_participant_count")
```

API: `/admin/events` create/PATCH accepts these; service permits them only when
`event_status='completed'`. Public event detail exposes them when present.

## M2 — Success Story source linking (spec §4.9, AC: created from event/programme/procurement)

```prisma
enum StorySource { event programme procurement_update independent }

// model SuccessStory — add:
  sourceType     StorySource? @default(independent) @map("source_type")
  sourceRecordId String?      @map("source_record_id") @db.Uuid   // soft polymorphic ref
```

`source_record_id` is a **soft reference** (no FK — target table varies by `source_type`);
the service validates it against the table implied by `source_type` and may prefill body/cover.
`independent` ⇒ `source_record_id` is null. API `/admin/success-stories` accepts both; public
detail may surface a compact source reference.

> Note: the spec also lists structured `background_problem/intervention/outcomes/quantifiable_impact`
> and `_ids` (commodity/programme/institution) plus `gallery_ids`/`video_ids`. Success Stories are
> a Phase-2 module; if the structured layout is required, model those before launch rather than
> collapsing into `body_*`.

## M3 — Procurement Update `status` (spec §4.8)

```prisma
// model ProcurementUpdate — add:
  status String? @map("status")   // informational, e.g. active | closed | upcoming
```

API `/admin/procurement-updates` accepts `status`; public list/detail expose it; informational only.

## M4 — Programme/Scheme relationships (spec §4.2)

```prisma
// model ProgrammeScheme — add:
  shortCode String? @map("short_code")
  commodities          ProgrammeCommodity[]
  permittedTrainingTypes ProgrammePermittedTrainingType[]
  // toolkits already linked via Toolkit.programme_scheme_id (one programme → many toolkits)

model ProgrammeCommodity {
  id String @id @default(uuid()) @db.Uuid
  programmeSchemeId String @map("programme_scheme_id") @db.Uuid
  commodityId String @map("commodity_id") @db.Uuid
  programmeScheme ProgrammeScheme @relation(fields: [programmeSchemeId], references: [id], onDelete: Cascade)
  commodity Commodity @relation(fields: [commodityId], references: [id], onDelete: Restrict)
  @@unique([programmeSchemeId, commodityId])
  @@map("programme_commodities")
}

model ProgrammePermittedTrainingType {
  id String @id @default(uuid()) @db.Uuid
  programmeSchemeId String @map("programme_scheme_id") @db.Uuid
  trainingTypeId String @map("training_type_id") @db.Uuid
  programmeScheme ProgrammeScheme @relation(fields: [programmeSchemeId], references: [id], onDelete: Cascade)
  trainingType TrainingType @relation(fields: [trainingTypeId], references: [id], onDelete: Restrict)
  @@unique([programmeSchemeId, trainingTypeId])
  @@map("programme_permitted_training_types")
}
```

Add back-relations `programmeCommodities ProgrammeCommodity[]` to `Commodity` and
`programmePermittedTrainingTypes ProgrammePermittedTrainingType[]` to `TrainingType`.
API `/admin/programmes` accepts `short_code`, `commodity_ids`, `permitted_training_type_ids`;
when set, event create validates `training_type_id` against the linked programme's permitted set.

## Medium checklist
- [ ] M1 event completion columns + completed-state guard.
- [ ] M2 success-story `source_type`/`source_record_id` + service validation.
- [ ] M3 procurement `status`.
- [ ] M4 programme `short_code` + commodity/training-type junctions + event validation.
```