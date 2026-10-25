-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'secretaria', 'tesouraria', 'pastor', 'lider');

-- CreateTable
CREATE TABLE "ChurchUser" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "clerkUserId" TEXT,
    "clerkInvitationId" TEXT,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "papel" "UserRole" NOT NULL DEFAULT 'lider',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChurchUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChurchUser_churchId_email_key" ON "ChurchUser"("churchId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "ChurchUser_churchId_clerkUserId_key" ON "ChurchUser"("churchId", "clerkUserId");

-- AddForeignKey
ALTER TABLE "ChurchUser" ADD CONSTRAINT "ChurchUser_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
