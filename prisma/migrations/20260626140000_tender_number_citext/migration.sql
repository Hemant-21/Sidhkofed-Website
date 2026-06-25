-- Phase 9 remediation — Issue 2 (case-insensitivity): tender numbers are unique CASE-INSENSITIVELY.
-- Switch tenders.tender_number to the `citext` type so the existing unique index and all equality
-- lookups compare case-insensitively ("TND/001" == "tnd/001"), while the original casing is kept in
-- storage. The existing `tenders_tender_number_key` unique index is rebuilt automatically by the
-- type change and thereafter enforces case-insensitive uniqueness. NULLs remain distinct, so
-- multiple tenders may still omit the number.

-- Enable the citext extension (idempotent).
CREATE EXTENSION IF NOT EXISTS citext;

-- AlterTable
ALTER TABLE "tenders" ALTER COLUMN "tender_number" SET DATA TYPE CITEXT;
