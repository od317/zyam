-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Project_isPublished_createdAt_idx" ON "Project"("isPublished", "createdAt");
