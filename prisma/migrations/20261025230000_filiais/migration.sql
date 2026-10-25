-- AlterTable
ALTER TABLE "Cell" ADD COLUMN     "congregationId" TEXT;

-- AlterTable
ALTER TABLE "ChurchUser" ADD COLUMN     "congregationId" TEXT;

-- AlterTable
ALTER TABLE "Congregation" ADD COLUMN     "bairro" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "cep" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "cidade" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "dirigente" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "numero" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "rua" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "telefone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "uf" CHAR(2) NOT NULL DEFAULT '';

-- AddForeignKey
ALTER TABLE "ChurchUser" ADD CONSTRAINT "ChurchUser_congregationId_fkey" FOREIGN KEY ("congregationId") REFERENCES "Congregation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cell" ADD CONSTRAINT "Cell_congregationId_fkey" FOREIGN KEY ("congregationId") REFERENCES "Congregation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

