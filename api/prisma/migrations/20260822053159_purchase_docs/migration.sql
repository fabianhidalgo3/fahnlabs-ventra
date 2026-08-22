-- CreateEnum
CREATE TYPE "DocType" AS ENUM ('GUIA', 'FACTURA');

-- CreateTable
CREATE TABLE "PurchaseDoc" (
    "id" TEXT NOT NULL,
    "type" "DocType" NOT NULL,
    "supplier" TEXT,
    "folio" TEXT,
    "docDate" TIMESTAMP(3),
    "amount" DECIMAL(12,2),
    "note" TEXT,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseDoc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseDoc_type_docDate_idx" ON "PurchaseDoc"("type", "docDate");
