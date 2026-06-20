-- AlterTable
ALTER TABLE `trades` ADD COLUMN `escrow_derivation_path` VARCHAR(191) NULL,
    ADD COLUMN `escrow_private_key` VARCHAR(191) NULL;
