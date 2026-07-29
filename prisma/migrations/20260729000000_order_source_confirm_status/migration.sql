-- AlterTable
ALTER TABLE "orders" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'staff';
ALTER TABLE "orders" ADD COLUMN "confirmStatus" TEXT NOT NULL DEFAULT 'confirmado';
