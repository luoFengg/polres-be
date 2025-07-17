-- CreateTable
CREATE TABLE "Anggota" (
    "id" TEXT NOT NULL,
    "nrp" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jabatan" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'anggota',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anggota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Simpanan" (
    "anggotaId" TEXT NOT NULL,
    "simpananPokok" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "simpananWajib" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "simpananSukarela" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tabunganHariRaya" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Simpanan_pkey" PRIMARY KEY ("anggotaId")
);

-- CreateTable
CREATE TABLE "TokoKategori" (
    "id" TEXT NOT NULL,
    "namaKategori" TEXT NOT NULL,

    CONSTRAINT "TokoKategori_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokoProduk" (
    "id" TEXT NOT NULL,
    "namaProduk" TEXT NOT NULL,
    "harga" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "kategoriId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokoProduk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Piutang" (
    "id" TEXT NOT NULL,
    "anggotaId" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "besarPinjaman" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalPiutang" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "biayaAngsuran" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "sisaPiutang" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "sisaAngsuran" INTEGER NOT NULL DEFAULT 0,
    "totalAngsuran" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Piutang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PiutangTransaction" (
    "id" TEXT NOT NULL,
    "piutangId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "processedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PiutangTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Anggota_nrp_key" ON "Anggota"("nrp");

-- CreateIndex
CREATE UNIQUE INDEX "TokoKategori_namaKategori_key" ON "TokoKategori"("namaKategori");

-- AddForeignKey
ALTER TABLE "Simpanan" ADD CONSTRAINT "Simpanan_anggotaId_fkey" FOREIGN KEY ("anggotaId") REFERENCES "Anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokoProduk" ADD CONSTRAINT "TokoProduk_kategoriId_fkey" FOREIGN KEY ("kategoriId") REFERENCES "TokoKategori"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Piutang" ADD CONSTRAINT "Piutang_anggotaId_fkey" FOREIGN KEY ("anggotaId") REFERENCES "Anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PiutangTransaction" ADD CONSTRAINT "PiutangTransaction_piutangId_fkey" FOREIGN KEY ("piutangId") REFERENCES "Piutang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PiutangTransaction" ADD CONSTRAINT "PiutangTransaction_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "Anggota"("id") ON DELETE SET NULL ON UPDATE CASCADE;
