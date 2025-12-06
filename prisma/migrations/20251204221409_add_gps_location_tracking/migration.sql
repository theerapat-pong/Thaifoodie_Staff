-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('VERIFIED', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "check_in_accuracy" DECIMAL(10,2),
ADD COLUMN     "check_in_distance" DECIMAL(10,2),
ADD COLUMN     "check_in_latitude" DECIMAL(10,8),
ADD COLUMN     "check_in_longitude" DECIMAL(11,8),
ADD COLUMN     "check_in_status" "LocationStatus" NOT NULL DEFAULT 'VERIFIED',
ADD COLUMN     "check_out_accuracy" DECIMAL(10,2),
ADD COLUMN     "check_out_distance" DECIMAL(10,2),
ADD COLUMN     "check_out_latitude" DECIMAL(10,8),
ADD COLUMN     "check_out_longitude" DECIMAL(11,8),
ADD COLUMN     "check_out_status" "LocationStatus",
ADD COLUMN     "is_notified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "location_approved_at" TIMESTAMP(3),
ADD COLUMN     "location_approved_by" TEXT;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "quota_annual" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "quota_personal" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "quota_sick" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "work_locations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'ร้านหลัก',
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "allowed_radius" INTEGER NOT NULL DEFAULT 100,
    "warning_radius" INTEGER NOT NULL DEFAULT 500,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_locations_pkey" PRIMARY KEY ("id")
);
