-- Remediation Issue 1 — Document audit foreign keys.
-- `documents.created_by` / `documents.updated_by` were scalar UUIDs with no FK. Make them
-- nullable and add proper relations to `users` with ON DELETE SET NULL, consistent with the
-- media / galleries / videos / settings audit-author relations: removing a user preserves the
-- historical document rather than blocking or cascading the delete. Backward compatible — the
-- columns already hold the same UUIDs.

-- AlterTable
ALTER TABLE "documents" ALTER COLUMN "created_by" DROP NOT NULL,
ALTER COLUMN "updated_by" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
