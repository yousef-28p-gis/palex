-- AlterTable
ALTER TABLE `users` ADD COLUMN `is_active_now` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `last_seen_at` DATETIME(3) NULL,
    ADD COLUMN `work_days` JSON NULL,
    ADD COLUMN `work_hours_end` VARCHAR(191) NULL,
    ADD COLUMN `work_hours_start` VARCHAR(191) NULL;
