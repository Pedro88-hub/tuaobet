-- CreateEnum
CREATE TYPE "AnnouncementDisplayMode" AS ENUM ('BAR', 'MODAL', 'TOAST');

-- AlterTable
ALTER TABLE "GlobalAnnouncement" ADD COLUMN "displayMode" "AnnouncementDisplayMode" NOT NULL DEFAULT 'BAR';
ALTER TABLE "GlobalAnnouncement" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "GlobalAnnouncement" ADD COLUMN "bgColor" TEXT;
ALTER TABLE "GlobalAnnouncement" ADD COLUMN "titleColor" TEXT;
ALTER TABLE "GlobalAnnouncement" ADD COLUMN "messageColor" TEXT;
ALTER TABLE "GlobalAnnouncement" ADD COLUMN "accentColor" TEXT;
