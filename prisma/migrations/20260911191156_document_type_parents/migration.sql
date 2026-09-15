-- AlterTable
ALTER TABLE "document_types" ADD COLUMN     "communication_type_id" UUID,
ADD COLUMN     "knowledge_category_id" UUID;

-- CreateIndex
CREATE INDEX "document_types_knowledge_category_id_idx" ON "document_types"("knowledge_category_id");

-- CreateIndex
CREATE INDEX "document_types_communication_type_id_idx" ON "document_types"("communication_type_id");

-- AddForeignKey
ALTER TABLE "document_types" ADD CONSTRAINT "document_types_knowledge_category_id_fkey" FOREIGN KEY ("knowledge_category_id") REFERENCES "knowledge_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_types" ADD CONSTRAINT "document_types_communication_type_id_fkey" FOREIGN KEY ("communication_type_id") REFERENCES "communication_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: deterministic Document Type -> parent-family mapping.
-- Communication family (-> Notifications):
UPDATE "document_types" dt SET "communication_type_id" = ct.id
FROM "communication_types" ct
WHERE dt.name_en = 'Notice' AND ct.name_en = 'Notice';

UPDATE "document_types" dt SET "communication_type_id" = ct.id
FROM "communication_types" ct
WHERE dt.name_en = 'Circular' AND ct.name_en = 'Circular';

UPDATE "document_types" dt SET "communication_type_id" = ct.id
FROM "communication_types" ct
WHERE dt.name_en = 'Office Order' AND ct.name_en = 'Office Order';

-- Knowledge family (-> Publications):
UPDATE "document_types" dt SET "knowledge_category_id" = kc.id
FROM "knowledge_categories" kc
WHERE dt.name_en = 'MoU' AND kc.name_en = 'Acts and Rules';

UPDATE "document_types" dt SET "knowledge_category_id" = kc.id
FROM "knowledge_categories" kc
WHERE dt.name_en = 'Report' AND kc.name_en = 'Research and Reports';

UPDATE "document_types" dt SET "knowledge_category_id" = kc.id
FROM "knowledge_categories" kc
WHERE dt.name_en = 'Policy' AND kc.name_en = 'Policies and Guidelines';

UPDATE "document_types" dt SET "knowledge_category_id" = kc.id
FROM "knowledge_categories" kc
WHERE dt.name_en = 'Guideline' AND kc.name_en = 'Policies and Guidelines';

UPDATE "document_types" dt SET "knowledge_category_id" = kc.id
FROM "knowledge_categories" kc
WHERE dt.name_en = 'SOP' AND kc.name_en = 'SOPs and Manuals';

UPDATE "document_types" dt SET "knowledge_category_id" = kc.id
FROM "knowledge_categories" kc
WHERE dt.name_en = 'Training Material' AND kc.name_en = 'Training Resources';

UPDATE "document_types" dt SET "knowledge_category_id" = kc.id
FROM "knowledge_categories" kc
WHERE dt.name_en = 'Form' AND kc.name_en = 'Forms and Formats';

UPDATE "document_types" dt SET "knowledge_category_id" = kc.id
FROM "knowledge_categories" kc
WHERE dt.name_en = 'Publication' AND kc.name_en = 'Publications';

UPDATE "document_types" dt SET "knowledge_category_id" = kc.id
FROM "knowledge_categories" kc
WHERE dt.name_en = 'Other' AND kc.name_en = 'Bye-laws';

-- Fallback: any Document Type not covered by the mapping above (custom/unknown rows in an
-- environment with data that differs from the seed catalogue) defaults to the first active
-- Knowledge Category by display_order, so the XOR check below can be added safely. Review
-- these rows after migrating: any row whose knowledge_category_id was set by this fallback
-- (rather than the explicit mapping above) should be reassigned deliberately via the Masters UI.
UPDATE "document_types" dt
SET "knowledge_category_id" = (
  SELECT kc.id FROM "knowledge_categories" kc
  WHERE kc.is_active = true
  ORDER BY kc.display_order ASC NULLS LAST, kc.name_en ASC
  LIMIT 1
)
WHERE dt.knowledge_category_id IS NULL AND dt.communication_type_id IS NULL;

-- Enforce exactly one parent family per Document Type (XOR).
ALTER TABLE "document_types" ADD CONSTRAINT "document_types_parent_family_xor"
  CHECK ((("knowledge_category_id" IS NOT NULL)::int + ("communication_type_id" IS NOT NULL)::int) = 1);
