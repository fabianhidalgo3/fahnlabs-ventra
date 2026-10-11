-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPERADMIN';

-- DropIndex
DROP INDEX "Product_barcode_key";

-- DropIndex
DROP INDEX "Product_sku_key";

-- AlterTable
ALTER TABLE "CashSession" ADD COLUMN     "businessId" TEXT NOT NULL DEFAULT 'b0000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "businessId" TEXT NOT NULL DEFAULT 'b0000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "businessId" TEXT NOT NULL DEFAULT 'b0000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "InventoryCount" ADD COLUMN     "businessId" TEXT NOT NULL DEFAULT 'b0000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "businessId" TEXT NOT NULL DEFAULT 'b0000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN     "businessId" TEXT NOT NULL DEFAULT 'b0000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "PurchaseDoc" ADD COLUMN     "businessId" TEXT NOT NULL DEFAULT 'b0000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "businessId" TEXT NOT NULL DEFAULT 'b0000000-0000-0000-0000-000000000001';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "businessId" TEXT NOT NULL DEFAULT 'b0000000-0000-0000-0000-000000000001';

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rut" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- Negocio por defecto para los datos existentes
INSERT INTO "Business" ("id", "name", "rut") VALUES ('b0000000-0000-0000-0000-000000000001', 'FHAN Market', NULL);

-- El admin original pasa a SUPERADMIN


-- CreateIndex
CREATE UNIQUE INDEX "Product_businessId_sku_key" ON "Product"("businessId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_businessId_barcode_key" ON "Product"("businessId", "barcode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDoc" ADD CONSTRAINT "PurchaseDoc_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;



-- (SUPERADMIN se asigna post-migración: enum nuevo no usable en la misma transacción)

-- quitar defaults de backfill (los nuevos registros deben declarar negocio)
ALTER TABLE "CashSession" ALTER COLUMN "businessId" DROP DEFAULT;
ALTER TABLE "Category" ALTER COLUMN "businessId" DROP DEFAULT;
ALTER TABLE "Customer" ALTER COLUMN "businessId" DROP DEFAULT;
ALTER TABLE "InventoryCount" ALTER COLUMN "businessId" DROP DEFAULT;
ALTER TABLE "Product" ALTER COLUMN "businessId" DROP DEFAULT;
ALTER TABLE "Promotion" ALTER COLUMN "businessId" DROP DEFAULT;
ALTER TABLE "PurchaseDoc" ALTER COLUMN "businessId" DROP DEFAULT;
ALTER TABLE "Sale" ALTER COLUMN "businessId" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "businessId" DROP DEFAULT;
