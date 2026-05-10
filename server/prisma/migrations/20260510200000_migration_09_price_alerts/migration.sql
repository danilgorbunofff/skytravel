-- CreateTable
CREATE TABLE `PriceAlert` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `externalId` VARCHAR(191) NOT NULL,
    `tourTitle` VARCHAR(191) NOT NULL,
    `priceMax` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `triggered` BOOLEAN NOT NULL DEFAULT false,
    `triggeredAt` DATETIME(3) NULL,

    INDEX `PriceAlert_providerId_externalId_idx`(`providerId`, `externalId`),
    INDEX `PriceAlert_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
