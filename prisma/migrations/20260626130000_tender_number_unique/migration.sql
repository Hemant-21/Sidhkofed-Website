-- Phase 9 remediation — Issue 2: Tender number uniqueness.
-- Tender numbers are official reference codes and must be globally unique. The column is nullable;
-- a Postgres unique index treats NULLs as distinct, so multiple tenders may omit the number while
-- every supplied (non-null) number stays unique. The service layer pre-checks duplicates and maps
-- the resulting P2002 to a 409 Conflict for the concurrent (race) case.

-- CreateIndex
CREATE UNIQUE INDEX "tenders_tender_number_key" ON "tenders"("tender_number");
