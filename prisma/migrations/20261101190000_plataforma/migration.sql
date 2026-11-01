-- AlterTable
ALTER TABLE "Church" ADD COLUMN     "bloqueada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bloqueioMotivo" TEXT;

-- CreateTable
CREATE TABLE "PlatformLog" (
    "id" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "churchId" TEXT,
    "churchNome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformLog_createdAt_idx" ON "PlatformLog"("createdAt");


-- CNPJ único entre as igrejas quando preenchido, comparando só os números (com ou sem pontuação).
CREATE UNIQUE INDEX "Church_cnpj_digitos_key" ON "Church" ((regexp_replace("cnpj", '\D', '', 'g'))) WHERE "cnpj" <> '';
