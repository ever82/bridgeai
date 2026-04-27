-- AlterTable
ALTER TABLE "reviews"
  ADD COLUMN "honesty_rating" INTEGER,
  ADD COLUMN "politeness_rating" INTEGER,
  ADD COLUMN "responsiveness_rating" INTEGER,
  ADD COLUMN "satisfaction_rating" INTEGER;
