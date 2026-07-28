-- AlterTable
ALTER TABLE "orders" ADD COLUMN "customerPhone" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN "tariffPaid" BOOLEAN NOT NULL DEFAULT false;
