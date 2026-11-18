/*
  Warnings:

  - Added the required column `originalKey` to the `ProjectImage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProjectImage" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "blurDataUrl" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "originalKey" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "ProjectImage_status_createdAt_idx" ON "ProjectImage"("status", "createdAt");
