-- AlterTable
ALTER TABLE "procurement_updates" ADD COLUMN     "display_quantity_as_mt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quantity" DECIMAL(14,2);
