-- CreateTable
CREATE TABLE "CellStudy" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "semana" DATE NOT NULL,
    "tema" TEXT NOT NULL,
    "referencia" TEXT NOT NULL DEFAULT '',
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CellStudy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CellStudy_churchId_semana_key" ON "CellStudy"("churchId", "semana");

-- AddForeignKey
ALTER TABLE "CellStudy" ADD CONSTRAINT "CellStudy_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

