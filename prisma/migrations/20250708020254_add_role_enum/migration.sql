/*
  Warnings:

  - The `role` column on the `Anggota` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'anggota');

-- AlterTable
ALTER TABLE "Anggota" DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'anggota';
