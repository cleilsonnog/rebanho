-- CreateTable
CREATE TABLE "ChurchLogo" (
    "churchId" TEXT NOT NULL,
    "dados" BYTEA NOT NULL,
    "tipo" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChurchLogo_pkey" PRIMARY KEY ("churchId")
);

-- AddForeignKey
ALTER TABLE "ChurchLogo" ADD CONSTRAINT "ChurchLogo_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

