-- AlterTable: Add hashedEmail for PII hashing
ALTER TABLE `Lead` ADD `hashedEmail` VARCHAR(64) NULL;
ALTER TABLE `PriceAlert` ADD `hashedEmail` VARCHAR(64) NULL;
