-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('cursando', 'concluido', 'desistiu');

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolClass" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "inicio" DATE,
    "horario" TEXT NOT NULL DEFAULT '',
    "local" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolTeacher" (
    "classId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "SchoolTeacher_pkey" PRIMARY KEY ("classId","memberId")
);

-- CreateTable
CREATE TABLE "SchoolEnrollment" (
    "classId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "situacao" "EnrollmentStatus" NOT NULL DEFAULT 'cursando',
    "concluidoEm" DATE,

    CONSTRAINT "SchoolEnrollment_pkey" PRIMARY KEY ("classId","memberId")
);

-- CreateTable
CREATE TABLE "SchoolLesson" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "tema" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolAttendance" (
    "lessonId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "SchoolAttendance_pkey" PRIMARY KEY ("lessonId","memberId")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_churchId_nome_key" ON "School"("churchId", "nome");

-- CreateIndex
CREATE INDEX "SchoolClass_churchId_idx" ON "SchoolClass"("churchId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolClass_schoolId_nome_key" ON "SchoolClass"("schoolId", "nome");

-- CreateIndex
CREATE INDEX "SchoolLesson_churchId_data_idx" ON "SchoolLesson"("churchId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolLesson_classId_data_key" ON "SchoolLesson"("classId", "data");

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolClass" ADD CONSTRAINT "SchoolClass_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolClass" ADD CONSTRAINT "SchoolClass_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolTeacher" ADD CONSTRAINT "SchoolTeacher_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolTeacher" ADD CONSTRAINT "SchoolTeacher_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolEnrollment" ADD CONSTRAINT "SchoolEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolEnrollment" ADD CONSTRAINT "SchoolEnrollment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolLesson" ADD CONSTRAINT "SchoolLesson_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolLesson" ADD CONSTRAINT "SchoolLesson_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolAttendance" ADD CONSTRAINT "SchoolAttendance_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "SchoolLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolAttendance" ADD CONSTRAINT "SchoolAttendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

