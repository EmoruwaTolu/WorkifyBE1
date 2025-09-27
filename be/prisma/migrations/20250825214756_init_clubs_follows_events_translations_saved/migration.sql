/*
  Warnings:

  - You are about to drop the column `createdById` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `endsAt` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `startsAt` on the `Event` table. All the data in the column will be lost.
  - The primary key for the `EventTranslation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `status` on the `EventTranslation` table. All the data in the column will be lost.
  - The `locale` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `ClubFollower` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Club` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ownerUserId]` on the table `Club` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[eventId,lang]` on the table `EventTranslation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ownerUserId` to the `Club` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Club` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdBy` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startAt` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Made the column `locationName` on table `Event` required. This step will fail if there are existing NULL values in that column.
  - The required column `id` was added to the `EventTranslation` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Changed the type of `lang` on the `EventTranslation` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `description` on table `EventTranslation` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('student', 'club');

-- CreateEnum
CREATE TYPE "public"."Language" AS ENUM ('en', 'fr');

-- CreateEnum
CREATE TYPE "public"."EventStatus" AS ENUM ('draft', 'published', 'archived');

-- DropForeignKey
ALTER TABLE "public"."ClubFollower" DROP CONSTRAINT "ClubFollower_clubId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ClubFollower" DROP CONSTRAINT "ClubFollower_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Event" DROP CONSTRAINT "Event_clubId_fkey";

-- DropIndex
DROP INDEX "public"."Club_name_key";

-- DropIndex
DROP INDEX "public"."Event_clubId_startsAt_idx";

-- DropIndex
DROP INDEX "public"."Event_startsAt_idx";

-- AlterTable
ALTER TABLE "public"."Club" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "ownerUserId" TEXT NOT NULL,
ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Event" DROP COLUMN "createdById",
DROP COLUMN "endsAt",
DROP COLUMN "startsAt",
ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "endAt" TIMESTAMP(3),
ADD COLUMN     "startAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "status" "public"."EventStatus" NOT NULL DEFAULT 'draft',
ALTER COLUMN "locationName" SET NOT NULL,
ALTER COLUMN "tags" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."EventTranslation" DROP CONSTRAINT "EventTranslation_pkey",
DROP COLUMN "status",
ADD COLUMN     "id" TEXT NOT NULL,
DROP COLUMN "lang",
ADD COLUMN     "lang" "public"."Language" NOT NULL,
ALTER COLUMN "description" SET NOT NULL,
ADD CONSTRAINT "EventTranslation_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "role" "public"."Role" NOT NULL DEFAULT 'student',
DROP COLUMN "locale",
ADD COLUMN     "locale" "public"."Language" NOT NULL DEFAULT 'en';

-- DropTable
DROP TABLE "public"."ClubFollower";

-- DropEnum
DROP TYPE "public"."Lang";

-- DropEnum
DROP TYPE "public"."TranslationStatus";

-- CreateTable
CREATE TABLE "public"."Follow" (
    "userId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("userId","clubId")
);

-- CreateIndex
CREATE INDEX "Follow_clubId_idx" ON "public"."Follow"("clubId");

-- CreateIndex
CREATE INDEX "Follow_userId_createdAt_idx" ON "public"."Follow"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Club_slug_key" ON "public"."Club"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Club_ownerUserId_key" ON "public"."Club"("ownerUserId");

-- CreateIndex
CREATE INDEX "Event_startAt_idx" ON "public"."Event"("startAt");

-- CreateIndex
CREATE INDEX "Event_clubId_startAt_idx" ON "public"."Event"("clubId", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventTranslation_eventId_lang_key" ON "public"."EventTranslation"("eventId", "lang");

-- CreateIndex
CREATE INDEX "SavedEvent_createdAt_idx" ON "public"."SavedEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Club" ADD CONSTRAINT "Club_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Follow" ADD CONSTRAINT "Follow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Follow" ADD CONSTRAINT "Follow_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "public"."Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "public"."Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
