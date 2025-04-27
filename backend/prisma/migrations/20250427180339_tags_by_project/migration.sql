/*
  Warnings:

  - You are about to drop the column `companyId` on the `Tag` table. All the data in the column will be lost.
  - Added the required column `projectId` to the `Tag` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Tag" DROP CONSTRAINT "Tag_companyId_fkey";

-- AlterTable
ALTER TABLE "Tag" DROP COLUMN "companyId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
