-- Migration 15: SiteSetting for global admin toggles (e.g. leadPopupEnabled)
CREATE TABLE IF NOT EXISTS `SiteSetting` (
  `key` VARCHAR(100) NOT NULL,
  `value` TEXT NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO `SiteSetting` (`key`, `value`) VALUES ('leadPopupEnabled', 'true');
