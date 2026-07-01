-- AlterTable
ALTER TABLE "institutional_memberships" ADD COLUMN     "nominal_member_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "primary_member_count" INTEGER NOT NULL DEFAULT 0;
