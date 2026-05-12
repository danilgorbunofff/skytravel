-- AlterTable: add stateId column
ALTER TABLE `ProviderTour` ADD COLUMN `stateId` INTEGER NULL;

-- Backfill from existing regionKey values ("townFrom-stateId" format)
UPDATE `ProviderTour`
SET `stateId` = CAST(SUBSTRING_INDEX(`regionKey`, '-', -1) AS UNSIGNED)
WHERE `source` = 'orextravel';

-- AddIndex
CREATE INDEX `ProviderTour_source_stateId_idx`
  ON `ProviderTour` (`source`, `stateId`);
