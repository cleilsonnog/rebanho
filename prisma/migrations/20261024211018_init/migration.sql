-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ativo', 'afastado', 'visitante', 'transferido');

-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "EstadoCivil" AS ENUM ('solteiro', 'casado', 'divorciado', 'viuvo');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('entrada', 'saida');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('pix', 'dinheiro', 'cartao', 'transferencia', 'boleto');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('culto', 'reuniao', 'evento', 'ensaio', 'curso');

-- CreateEnum
CREATE TYPE "CertificateStyle" AS ENUM ('classico', 'moderno', 'minimalista');

-- CreateTable
CREATE TABLE "Church" (
    "id" TEXT NOT NULL,
    "clerkOrgId" TEXT,
    "nome" TEXT NOT NULL,
    "sigla" TEXT NOT NULL DEFAULT '',
    "cnpj" TEXT NOT NULL DEFAULT '',
    "pastor" TEXT NOT NULL DEFAULT '',
    "telefone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "rua" TEXT NOT NULL DEFAULT '',
    "numero" TEXT NOT NULL DEFAULT '',
    "bairro" TEXT NOT NULL DEFAULT '',
    "cidade" TEXT NOT NULL DEFAULT '',
    "uf" CHAR(2) NOT NULL DEFAULT '',
    "cep" TEXT NOT NULL DEFAULT '',
    "whatsappConectado" BOOLEAN NOT NULL DEFAULT false,
    "whatsappNumero" TEXT,
    "whatsappDiasAntes" INTEGER NOT NULL DEFAULT 1,
    "whatsappAutomatico" BOOLEAN NOT NULL DEFAULT true,
    "whatsappMensagem" TEXT NOT NULL DEFAULT 'Olá, {nome}! 🎉 A {igreja} celebra a sua vida hoje. Feliz aniversário!',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Church_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Congregation" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Congregation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "congregationId" TEXT,
    "nome" TEXT NOT NULL,
    "sexo" "Sexo" NOT NULL,
    "nascimento" DATE NOT NULL,
    "telefone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "estadoCivil" "EstadoCivil" NOT NULL DEFAULT 'solteiro',
    "rua" TEXT NOT NULL DEFAULT '',
    "numero" TEXT NOT NULL DEFAULT '',
    "bairro" TEXT NOT NULL DEFAULT '',
    "cidade" TEXT NOT NULL DEFAULT '',
    "uf" CHAR(2) NOT NULL DEFAULT '',
    "cep" TEXT NOT NULL DEFAULT '',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "cargo" TEXT NOT NULL DEFAULT 'Membro',
    "ministerios" TEXT[],
    "status" "MemberStatus" NOT NULL DEFAULT 'ativo',
    "batizado" BOOLEAN NOT NULL DEFAULT false,
    "dataBatismo" DATE,
    "membroDesde" DATE NOT NULL,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "responsavel" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "notas" TEXT NOT NULL,
    "proximaVisita" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "memberId" TEXT,
    "tipo" "TransactionType" NOT NULL,
    "categoria" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "data" DATE NOT NULL,
    "descricao" TEXT NOT NULL,
    "formaPagamento" "PaymentMethod" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "hora" VARCHAR(5) NOT NULL,
    "local" TEXT NOT NULL,
    "tipo" "EventType" NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "estilo" "CertificateStyle" NOT NULL,
    "detalhe" TEXT NOT NULL DEFAULT '',
    "emitidoEm" DATE NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Church_clerkOrgId_key" ON "Church"("clerkOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "Congregation_churchId_nome_key" ON "Congregation"("churchId", "nome");

-- CreateIndex
CREATE INDEX "Member_churchId_nome_idx" ON "Member"("churchId", "nome");

-- CreateIndex
CREATE INDEX "Member_churchId_status_idx" ON "Member"("churchId", "status");

-- CreateIndex
CREATE INDEX "Visit_churchId_data_idx" ON "Visit"("churchId", "data");

-- CreateIndex
CREATE INDEX "Transaction_churchId_data_idx" ON "Transaction"("churchId", "data");

-- CreateIndex
CREATE INDEX "Event_churchId_data_idx" ON "Event"("churchId", "data");

-- CreateIndex
CREATE INDEX "Certificate_churchId_emitidoEm_idx" ON "Certificate"("churchId", "emitidoEm");

-- AddForeignKey
ALTER TABLE "Congregation" ADD CONSTRAINT "Congregation_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_congregationId_fkey" FOREIGN KEY ("congregationId") REFERENCES "Congregation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
