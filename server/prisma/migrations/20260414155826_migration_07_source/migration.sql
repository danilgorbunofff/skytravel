-- AlterTable
ALTER TABLE `Tour` ADD COLUMN `externalId` VARCHAR(191) NULL,
    ADD COLUMN `source` VARCHAR(191) NOT NULL DEFAULT 'manual';

-- CreateIndex
CREATE INDEX `Tour_source_idx` ON `Tour`(`source`);

-- CreateIndex
CREATE INDEX `Tour_source_externalId_idx` ON `Tour`(`source`, `externalId`);
