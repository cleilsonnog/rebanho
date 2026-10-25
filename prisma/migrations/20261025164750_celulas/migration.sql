-- CreateEnum
CREATE TYPE "CellRole" AS ENUM ('lider', 'colider', 'anfitriao');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "cellId" TEXT;

-- CreateTable
CREATE TABLE "Cell" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "diaSemana" INTEGER,
    "horario" VARCHAR(5) NOT NULL DEFAULT '',
    "rua" TEXT NOT NULL DEFAULT '',
    "numero" TEXT NOT NULL DEFAULT '',
    "bairro" TEXT NOT NULL DEFAULT '',
    "cidade" TEXT NOT NULL DEFAULT '',
    "uf" CHAR(2) NOT NULL DEFAULT '',
    "cep" TEXT NOT NULL DEFAULT '',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CellLeader" (
    "cellId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "funcao" "CellRole" NOT NULL,

    CONSTRAINT "CellLeader_pkey" PRIMARY KEY ("cellId","memberId","funcao")
);

-- CreateTable
CREATE TABLE "CellMeeting" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "cellId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "observacoes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CellMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CellAttendance" (
    "meetingId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "CellAttendance_pkey" PRIMARY KEY ("meetingId","memberId")
);

-- CreateTable
CREATE TABLE "CellVisitor" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CellVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cell_churchId_nome_key" ON "Cell"("churchId", "nome");

-- CreateIndex
CREATE INDEX "CellMeeting_churchId_data_idx" ON "CellMeeting"("churchId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "CellMeeting_cellId_data_key" ON "CellMeeting"("cellId", "data");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cell" ADD CONSTRAINT "Cell_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellLeader" ADD CONSTRAINT "CellLeader_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellLeader" ADD CONSTRAINT "CellLeader_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellMeeting" ADD CONSTRAINT "CellMeeting_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellMeeting" ADD CONSTRAINT "CellMeeting_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellAttendance" ADD CONSTRAINT "CellAttendance_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "CellMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellAttendance" ADD CONSTRAINT "CellAttendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellVisitor" ADD CONSTRAINT "CellVisitor_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "CellMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
