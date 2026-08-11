-- AlterTable
ALTER TABLE "orders" ADD COLUMN "couponDni" TEXT;
ALTER TABLE "orders" ADD COLUMN "discount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "coupon_uses" (
    "id" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_uses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coupon_uses_orderId_key" ON "coupon_uses"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_uses_dni_monthKey_key" ON "coupon_uses"("dni", "monthKey");

-- AddForeignKey
ALTER TABLE "coupon_uses" ADD CONSTRAINT "coupon_uses_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
