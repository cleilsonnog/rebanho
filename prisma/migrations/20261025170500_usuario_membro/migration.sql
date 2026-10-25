-- AlterTable
ALTER TABLE "ChurchUser" ADD COLUMN     "memberId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ChurchUser_memberId_key" ON "ChurchUser"("memberId");

-- AddForeignKey
ALTER TABLE "ChurchUser" ADD CONSTRAINT "ChurchUser_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

