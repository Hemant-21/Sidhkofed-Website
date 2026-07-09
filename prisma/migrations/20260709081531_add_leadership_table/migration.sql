-- CreateTable
CREATE TABLE "leadership" (
    "id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT,
    "govt_role_en" TEXT NOT NULL,
    "govt_role_hi" TEXT,
    "sidhkofed_role_en" TEXT NOT NULL,
    "sidhkofed_role_hi" TEXT,
    "photo_media_id" UUID,
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
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leadership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leadership_slug_key" ON "leadership"("slug");

-- CreateIndex
CREATE INDEX "leadership_publication_state_public_visibility_archived_at__idx" ON "leadership"("publication_state", "public_visibility", "archived_at", "published_at");

-- CreateIndex
CREATE INDEX "leadership_display_order_idx" ON "leadership"("display_order");

-- AddForeignKey
ALTER TABLE "leadership" ADD CONSTRAINT "leadership_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leadership" ADD CONSTRAINT "leadership_photo_media_id_fkey" FOREIGN KEY ("photo_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leadership" ADD CONSTRAINT "leadership_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
