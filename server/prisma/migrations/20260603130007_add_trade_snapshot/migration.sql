/*
  Warnings:

  - You are about to drop the column `price` on the `offers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `disputes` ADD COLUMN `trade_snapshot` JSON NULL;

-- AlterTable
ALTER TABLE `offers` DROP COLUMN `price`;
