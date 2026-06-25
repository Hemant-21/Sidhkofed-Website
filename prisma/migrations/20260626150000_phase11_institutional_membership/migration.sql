-- CreateEnum
CREATE TYPE "MembershipLevel" AS ENUM ('sidhkofed', 'district_union');

-- CreateEnum
CREATE TYPE "MembershipType" AS ENUM ('primary', 'nominal');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "institutional_memberships" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "membership_level" "MembershipLevel" NOT NULL,
    "membership_type" "MembershipType" NOT NULL,
    "membership_number" TEXT,
    "district_id" UUID,
    "district_union_id" UUID,
    "reporting_period_id" UUID,
    "status" "MembershipStatus" NOT NULL DEFAULT 'active',
    "join_date" DATE,
    "notes_en" TEXT,
    "notes_hi" TEXT,
    "slug" TEXT NOT NULL,
    "publication_state" "PublicationState" NOT NULL DEFAULT 'draft',
    "public_visibility" BOOLEAN NOT NULL DEFAULT true,
    "publish_start_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "highlight_type" "HighlightType",
    "highlight_start_at" TIMESTAMP(3),
    "highlight_end_at" TIMESTAMP(3),
    "display_order" INTEGER,
    "show_on_homepage" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutional_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "institutional_memberships_slug_key" ON "institutional_memberships"("slug");

-- CreateIndex
CREATE INDEX "institutional_memberships_publication_state_public_visibili_idx" ON "institutional_memberships"("publication_state", "public_visibility", "archived_at", "published_at");

-- CreateIndex
CREATE INDEX "institutional_memberships_membership_level_membership_type__idx" ON "institutional_memberships"("membership_level", "membership_type", "reporting_period_id");

-- CreateIndex
CREATE INDEX "institutional_memberships_institution_id_idx" ON "institutional_memberships"("institution_id");

-- CreateIndex
CREATE INDEX "institutional_memberships_district_id_idx" ON "institutional_memberships"("district_id");

-- CreateIndex
CREATE INDEX "institutional_memberships_show_on_homepage_display_order_idx" ON "institutional_memberships"("show_on_homepage", "display_order");

-- AddForeignKey
ALTER TABLE "institutional_memberships" ADD CONSTRAINT "institutional_memberships_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institutional_memberships" ADD CONSTRAINT "institutional_memberships_district_union_id_fkey" FOREIGN KEY ("district_union_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institutional_memberships" ADD CONSTRAINT "institutional_memberships_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institutional_memberships" ADD CONSTRAINT "institutional_memberships_reporting_period_id_fkey" FOREIGN KEY ("reporting_period_id") REFERENCES "reporting_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institutional_memberships" ADD CONSTRAINT "institutional_memberships_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institutional_memberships" ADD CONSTRAINT "institutional_memberships_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
