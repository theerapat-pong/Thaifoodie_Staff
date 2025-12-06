/*
  Warnings:

  - You are about to drop the column `metadata` on the `system_logs` table. All the data in the column will be lost.
  - Added the required column `action` to the `system_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `system_logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "LogLevel" ADD VALUE 'DEBUG';

-- DropIndex
DROP INDEX "system_logs_created_at_idx";

-- DropIndex
DROP INDEX "system_logs_level_idx";

-- AlterTable
ALTER TABLE "system_logs" DROP COLUMN "metadata",
ADD COLUMN     "action" TEXT NOT NULL,
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "details" JSONB,
ADD COLUMN     "duration_ms" INTEGER,
ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "user_agent" TEXT,
ADD COLUMN     "user_id" TEXT,
ALTER COLUMN "level" SET DEFAULT 'INFO';

-- CreateIndex
CREATE INDEX "system_logs_category_created_at_idx" ON "system_logs"("category", "created_at");

-- CreateIndex
CREATE INDEX "system_logs_user_id_created_at_idx" ON "system_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "system_logs_level_created_at_idx" ON "system_logs"("level", "created_at");
