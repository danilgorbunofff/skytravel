-- CreateTable
CREATE TABLE `ProviderRegion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `providerId` VARCHAR(191) NOT NULL,
    `regionKey` VARCHAR(191) NOT NULL,
    `externalId` VARCHAR(191) NOT NULL,
    `parentExternalId` VARCHAR(191) NOT NULL DEFAULT '',
    `name` VARCHAR(191) NOT NULL,
    `tourCount` INTEGER NOT NULL DEFAULT 0,
    `meta` JSON NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProviderRegion_providerId_idx`(`providerId`),
    UNIQUE INDEX `ProviderRegion_providerId_regionKey_key`(`providerId`, `regionKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
