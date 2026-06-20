/*
  Warnings:

  - You are about to drop the column `governorate` on the `kyc_requests` table. All the data in the column will be lost.
  - You are about to drop the column `id_back_image` on the `kyc_requests` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `kyc_requests` DROP COLUMN `governorate`,
    DROP COLUMN `id_back_image`;
