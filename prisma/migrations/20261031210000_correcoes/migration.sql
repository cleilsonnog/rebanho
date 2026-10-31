-- CreateEnum
CREATE TYPE "CorrectionStatus" AS ENUM ('pendente', 'aprovado', 'recusado');

-- AlterTable
ALTER TABLE "Church" ADD COLUMN     "portalAniversariantes" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "portalColegasCelula" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MemberCorrection" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "telefone" TEXT,
    "email" TEXT,
    "endereco" JSONB,
    "observacao" TEXT NOT NULL DEFAULT '',
    "status" "CorrectionStatus" NOT NULL DEFAULT 'pendente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvidoEm" TIMESTAMP(3),
    "resolvidoPor" TEXT,

    CONSTRAINT "MemberCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberCorrection_churchId_status_idx" ON "MemberCorrection"("churchId", "status");

-- CreateIndex
CREATE INDEX "MemberCorrection_memberId_idx" ON "MemberCorrection"("memberId");

-- AddForeignKey
ALTER TABLE "MemberCorrection" ADD CONSTRAINT "MemberCorrection_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberCorrection" ADD CONSTRAINT "MemberCorrection_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

