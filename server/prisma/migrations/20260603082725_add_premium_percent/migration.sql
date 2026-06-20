-- AlterTable
ALTER TABLE `offers` ADD COLUMN `premium_percent` DOUBLE NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `network_fees` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `network` VARCHAR(191) NOT NULL,
    `fee_amount` DOUBLE NOT NULL,
    `energy_fee` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `network_fees_network_key`(`network`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
