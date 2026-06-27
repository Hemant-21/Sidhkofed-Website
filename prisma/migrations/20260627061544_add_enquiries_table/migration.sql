-- CreateEnum
CREATE TYPE "SpamState" AS ENUM ('clean', 'suspected', 'spam');

-- CreateTable
CREATE TABLE "enquiries" (
    "id" UUID NOT NULL,
    "enquiry_type_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "mobile" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "organization" VARCHAR(255),
    "commodity_id" UUID,
    "programme_scheme_id" UUID,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source_ip_hash" VARCHAR(128),
    "spam_state" "SpamState" NOT NULL DEFAULT 'clean',
    "internal_notes" TEXT,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "enquiries_enquiry_type_id_idx" ON "enquiries"("enquiry_type_id");

-- CreateIndex
CREATE INDEX "enquiries_submitted_at_idx" ON "enquiries"("submitted_at" DESC);

-- CreateIndex
CREATE INDEX "enquiries_spam_state_idx" ON "enquiries"("spam_state");

-- CreateIndex
CREATE INDEX "enquiries_archived_at_idx" ON "enquiries"("archived_at");

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_enquiry_type_id_fkey" FOREIGN KEY ("enquiry_type_id") REFERENCES "enquiry_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_commodity_id_fkey" FOREIGN KEY ("commodity_id") REFERENCES "commodities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_programme_scheme_id_fkey" FOREIGN KEY ("programme_scheme_id") REFERENCES "programme_schemes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
