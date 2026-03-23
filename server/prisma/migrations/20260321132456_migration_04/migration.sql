-- CreateTable
CREATE TABLE `Lead` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `destination` VARCHAR(191) NULL,
    `tourId` INTEGER NULL,
    `marketingConsent` BOOLEAN NOT NULL DEFAULT false,
    `source` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Lead_marketingConsent_idx`(`marketingConsent`),
    INDEX `Lead_tourId_idx`(`tourId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailCampaign` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subject` VARCHAR(191) NOT NULL,
    `preheader` VARCHAR(191) NULL,
    `fromEmail` VARCHAR(191) NULL,
    `html` VARCHAR(191) NOT NULL,
    `segment` VARCHAR(191) NOT NULL,
    `recipientCount` INTEGER NOT NULL DEFAULT 0,
    `sentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_tourId_fkey` FOREIGN KEY (`tourId`) REFERENCES `Tour`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
