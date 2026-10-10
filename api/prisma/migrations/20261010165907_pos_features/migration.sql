-- CreateEnum
CREATE TYPE "CashStatus" AS ENUM ('ABIERTA', 'CERRADA');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "change" DECIMAL(12,2),
ADD COLUMN     "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tendered" DECIMAL(12,2),
ADD COLUMN     "voidedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CashSession" (
    "id" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "openingCash" DECIMAL(12,2) NOT NULL,
    "countedCash" DECIMAL(12,2),
    "expectedCash" DECIMAL(12,2),
    "difference" DECIMAL(12,2),
    "note" TEXT,
    "status" "CashStatus" NOT NULL DEFAULT 'ABIERTA',

    CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);
