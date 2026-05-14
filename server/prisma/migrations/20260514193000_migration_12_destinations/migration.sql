-- CreateTable
CREATE TABLE `Destination` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(191) NOT NULL,
    `czechName` VARCHAR(191) NOT NULL,
    `canonicalName` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Destination_slug_key`(`slug`),
    UNIQUE INDEX `Destination_czechName_key`(`czechName`),
    UNIQUE INDEX `Destination_canonicalName_key`(`canonicalName`),
    INDEX `Destination_slug_idx`(`slug`),
    INDEX `Destination_czechName_idx`(`czechName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DestinationMapping` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `destinationId` INTEGER NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `providerKey` VARCHAR(191) NOT NULL,
    `providerValue` VARCHAR(191) NOT NULL,
    `providerLabel` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DestinationMapping_providerId_providerKey_providerValue_key`(`providerId`, `providerKey`, `providerValue`),
    INDEX `DestinationMapping_destinationId_idx`(`destinationId`),
    INDEX `DestinationMapping_providerId_providerLabel_idx`(`providerId`, `providerLabel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `ProviderTour` ADD COLUMN `destinationId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `ProviderTour_destinationId_idx` ON `ProviderTour`(`destinationId`);

-- AddForeignKey
ALTER TABLE `ProviderTour` ADD CONSTRAINT `ProviderTour_destinationId_fkey` FOREIGN KEY (`destinationId`) REFERENCES `Destination`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DestinationMapping` ADD CONSTRAINT `DestinationMapping_destinationId_fkey` FOREIGN KEY (`destinationId`) REFERENCES `Destination`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;