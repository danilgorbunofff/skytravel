-- CreateTable
CREATE TABLE `ProviderTour` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `externalId` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `regionKey` VARCHAR(191) NOT NULL,
    `destination` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `price` INTEGER NOT NULL,
    `originalPrice` INTEGER NOT NULL DEFAULT 0,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `transport` VARCHAR(191) NOT NULL,
    `image` TEXT NOT NULL,
    `description` TEXT NULL,
    `photos` JSON NULL,
    `url` TEXT NOT NULL,
    `stars` VARCHAR(191) NOT NULL DEFAULT '',
    `board` VARCHAR(191) NOT NULL DEFAULT '',
    `nights` INTEGER NULL,
    `adults` INTEGER NULL,
    `children` INTEGER NULL,
    `roomType` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NULL,
    `offersCount` INTEGER NULL,
    `syncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProviderTour_source_regionKey_idx`(`source`, `regionKey`),
    INDEX `ProviderTour_price_idx`(`price`),
    INDEX `ProviderTour_startDate_idx`(`startDate`),
    INDEX `ProviderTour_source_regionKey_price_idx`(`source`, `regionKey`, `price`),
    UNIQUE INDEX `ProviderTour_source_externalId_key`(`source`, `externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProviderSync` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `providerId` VARCHAR(191) NOT NULL,
    `regionKey` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'idle',
    `lastSyncAt` DATETIME(3) NULL,
    `itemCount` INTEGER NOT NULL DEFAULT 0,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProviderSync_providerId_regionKey_key`(`providerId`, `regionKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
