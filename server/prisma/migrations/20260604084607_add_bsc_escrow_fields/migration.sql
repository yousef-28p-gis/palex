-- AlterTable
ALTER TABLE `trades` ADD COLUMN `bsc_escrow_address` VARCHAR(191) NULL,
    ADD COLUMN `bsc_escrow_private_key` VARCHAR(191) NULL,
    ADD COLUMN `deposit_network` VARCHAR(191) NULL;
