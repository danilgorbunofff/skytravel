/*
  Warnings:

  - Added the required column `endDate` to the `Tour` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `Tour` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transport` to the `Tour` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Tour` ADD COLUMN `endDate` DATETIME(3) NOT NULL,
    ADD COLUMN `i18n` JSON NULL,
    ADD COLUMN `startDate` DATETIME(3) NOT NULL,
    ADD COLUMN `transport` VARCHAR(191) NOT NULL;
