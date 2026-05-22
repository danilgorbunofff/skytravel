-- Phase 3: Schema integrity — VarChar limits, new indexes, redundant index cleanup.
-- This migration adds explicit column length limits (no data truncation expected
-- since MySQL default VARCHAR is 191 for indexed cols already) and new indexes
-- for common query patterns (Lead.createdAt, Lead.email, Tour sort, PriceAlert.triggered).
-- Removes redundant single-column indexes that are left-prefixes of composites
-- (Destination.slug/czechName already covered by UNIQUE constraints, ProviderTour.price/startDate
-- covered by composite indexes).

-- Tour: add sortOrder+createdAt and destination indexes
CREATE INDEX `Tour_sortOrder_createdAt_idx` ON `Tour`(`sortOrder`, `createdAt`);
CREATE INDEX `Tour_destination_idx` ON `Tour`(`destination`(100));

-- Lead: add createdAt and email indexes
CREATE INDEX `Lead_createdAt_idx` ON `Lead`(`createdAt`);
CREATE INDEX `Lead_email_idx` ON `Lead`(`email`);

-- PriceAlert: add triggered index for batch alert processing
CREATE INDEX `PriceAlert_triggered_idx` ON `PriceAlert`(`triggered`);

-- ProviderTour: add covering index for date+price range queries
CREATE INDEX `ProviderTour_source_regionKey_startDate_price_idx` ON `ProviderTour`(`source`, `regionKey`, `startDate`, `price`);

-- Remove redundant single-column indexes (left-prefixes of existing composites)
DROP INDEX `Destination_slug_idx` ON `Destination`;
DROP INDEX `Destination_czechName_idx` ON `Destination`;
DROP INDEX `ProviderTour_price_idx` ON `ProviderTour`;
DROP INDEX `ProviderTour_startDate_idx` ON `ProviderTour`;

-- Alter columns to add explicit VarChar limits (safe — these won't truncate existing data)
ALTER TABLE `Tour` MODIFY `destination` VARCHAR(255) NOT NULL;
ALTER TABLE `Tour` MODIFY `title` VARCHAR(500) NOT NULL;
ALTER TABLE `Tour` MODIFY `transport` VARCHAR(100) NOT NULL;
ALTER TABLE `Tour` MODIFY `image` VARCHAR(1000) NOT NULL;
ALTER TABLE `Tour` MODIFY `source` VARCHAR(50) NOT NULL DEFAULT 'manual';
ALTER TABLE `Tour` MODIFY `externalId` VARCHAR(255) NULL;

ALTER TABLE `AdminUser` MODIFY `login` VARCHAR(100) NOT NULL;
ALTER TABLE `AdminUser` MODIFY `passwordHash` VARCHAR(255) NOT NULL;

ALTER TABLE `Lead` MODIFY `email` VARCHAR(255) NOT NULL;
ALTER TABLE `Lead` MODIFY `destination` VARCHAR(500) NULL;
ALTER TABLE `Lead` MODIFY `source` VARCHAR(50) NULL DEFAULT 'web';

ALTER TABLE `EmailCampaign` MODIFY `subject` VARCHAR(500) NOT NULL;
ALTER TABLE `EmailCampaign` MODIFY `preheader` VARCHAR(500) NULL;
ALTER TABLE `EmailCampaign` MODIFY `fromEmail` VARCHAR(255) NULL;
ALTER TABLE `EmailCampaign` MODIFY `html` LONGTEXT NOT NULL;
ALTER TABLE `EmailCampaign` MODIFY `segment` VARCHAR(50) NOT NULL;

ALTER TABLE `ProviderTour` MODIFY `externalId` VARCHAR(255) NOT NULL;
ALTER TABLE `ProviderTour` MODIFY `source` VARCHAR(50) NOT NULL;
ALTER TABLE `ProviderTour` MODIFY `regionKey` VARCHAR(100) NOT NULL;
ALTER TABLE `ProviderTour` MODIFY `destination` VARCHAR(255) NOT NULL;
ALTER TABLE `ProviderTour` MODIFY `title` VARCHAR(500) NOT NULL;
ALTER TABLE `ProviderTour` MODIFY `transport` VARCHAR(100) NOT NULL;
ALTER TABLE `ProviderTour` MODIFY `stars` VARCHAR(10) NOT NULL DEFAULT '';
ALTER TABLE `ProviderTour` MODIFY `board` VARCHAR(50) NOT NULL DEFAULT '';
ALTER TABLE `ProviderTour` MODIFY `roomType` VARCHAR(100) NULL;
ALTER TABLE `ProviderTour` MODIFY `currency` VARCHAR(10) NULL;

ALTER TABLE `Destination` MODIFY `slug` VARCHAR(150) NOT NULL;
ALTER TABLE `Destination` MODIFY `czechName` VARCHAR(255) NOT NULL;
ALTER TABLE `Destination` MODIFY `canonicalName` VARCHAR(255) NOT NULL;

ALTER TABLE `DestinationMapping` MODIFY `providerId` VARCHAR(50) NOT NULL;
ALTER TABLE `DestinationMapping` MODIFY `providerKey` VARCHAR(100) NOT NULL;
ALTER TABLE `DestinationMapping` MODIFY `providerValue` VARCHAR(255) NOT NULL;
ALTER TABLE `DestinationMapping` MODIFY `providerLabel` VARCHAR(255) NOT NULL;

ALTER TABLE `ProviderSync` MODIFY `providerId` VARCHAR(50) NOT NULL;
ALTER TABLE `ProviderSync` MODIFY `regionKey` VARCHAR(100) NOT NULL;
ALTER TABLE `ProviderSync` MODIFY `status` VARCHAR(20) NOT NULL DEFAULT 'idle';

ALTER TABLE `ProviderRegion` MODIFY `providerId` VARCHAR(50) NOT NULL;
ALTER TABLE `ProviderRegion` MODIFY `regionKey` VARCHAR(100) NOT NULL;
ALTER TABLE `ProviderRegion` MODIFY `externalId` VARCHAR(100) NOT NULL;
ALTER TABLE `ProviderRegion` MODIFY `parentExternalId` VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE `ProviderRegion` MODIFY `name` VARCHAR(255) NOT NULL;

ALTER TABLE `PriceAlert` MODIFY `email` VARCHAR(255) NOT NULL;
ALTER TABLE `PriceAlert` MODIFY `providerId` VARCHAR(50) NOT NULL;
ALTER TABLE `PriceAlert` MODIFY `externalId` VARCHAR(255) NOT NULL;
ALTER TABLE `PriceAlert` MODIFY `tourTitle` VARCHAR(500) NOT NULL;
