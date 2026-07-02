-- Phase 11 remediation — Issue 1: Institutional membership duplicate prevention (database layer).
--
-- Duplicate membership rows would double-count institutions in dashboard reports #10–#13 (membership
-- counts, district/institution totals, summaries). Two database constraints back the service-layer
-- pre-checks and make duplicates impossible even under concurrent writes:
--
-- 1. membership_number — official reference codes must be globally unique. A standard Postgres unique
--    index treats NULLs as distinct, so non-null numbers stay unique while multiple records may omit
--    the number (the column is nullable).
--
-- 2. business key — one membership per institution × level × type × district-union × reporting-period
--    (audit-critical-fixes Fix 2). district_union_id and reporting_period_id are nullable; NULLS NOT
--    DISTINCT (PostgreSQL 15+) makes two NULLs collide, so a duplicate with an omitted DU/period is
--    still rejected by the database. The service layer pre-checks both and maps the resulting P2002
--    to a 409 Conflict for the concurrent (race) case.

-- CreateIndex
CREATE UNIQUE INDEX "institutional_memberships_membership_number_key"
  ON "institutional_memberships"("membership_number");

-- CreateIndex
CREATE UNIQUE INDEX "institutional_memberships_business_key"
  ON "institutional_memberships"(
    "institution_id",
    "membership_level",
    "membership_type",
    "district_union_id",
    "reporting_period_id"
  ) NULLS NOT DISTINCT;
