-- AlterTable
ALTER TABLE "Church" ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "logoUrl" TEXT;

-- CreateTable
CREATE TABLE "GeoBairro" (
    "chave" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeoBairro_pkey" PRIMARY KEY ("chave")
);

