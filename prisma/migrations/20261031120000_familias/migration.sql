-- CreateEnum
CREATE TYPE "Parentesco" AS ENUM ('responsavel', 'conjuge', 'filho', 'outro');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "familyId" TEXT,
ADD COLUMN     "parentesco" "Parentesco";

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Family_churchId_idx" ON "Family"("churchId");

-- CreateIndex
CREATE INDEX "Member_familyId_idx" ON "Member"("familyId");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Family" ADD CONSTRAINT "Family_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

