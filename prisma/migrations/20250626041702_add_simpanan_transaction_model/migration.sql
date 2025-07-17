-- AlterTable
ALTER TABLE "Simpanan" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastUpdatedBy" TEXT;

-- CreateTable
CREATE TABLE "SimpananTransaction" (
    "id" TEXT NOT NULL,
    "anggotaId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "balanceBefore" DECIMAL(65,30) NOT NULL,
    "balanceAfter" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "processedBy" TEXT,
    "isSystemGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimpananTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SimpananTransaction_anggotaId_createdAt_idx" ON "SimpananTransaction"("anggotaId", "createdAt");

-- CreateIndex
CREATE INDEX "SimpananTransaction_category_type_idx" ON "SimpananTransaction"("category", "type");

-- AddForeignKey
ALTER TABLE "Simpanan" ADD CONSTRAINT "Simpanan_lastUpdatedBy_fkey" FOREIGN KEY ("lastUpdatedBy") REFERENCES "Anggota"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimpananTransaction" ADD CONSTRAINT "SimpananTransaction_anggota_fkey" FOREIGN KEY ("anggotaId") REFERENCES "Anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimpananTransaction" ADD CONSTRAINT "SimpananTransaction_simpanan_fkey" FOREIGN KEY ("anggotaId") REFERENCES "Simpanan"("anggotaId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimpananTransaction" ADD CONSTRAINT "SimpananTransaction_processor_fkey" FOREIGN KEY ("processedBy") REFERENCES "Anggota"("id") ON DELETE SET NULL ON UPDATE CASCADE;
