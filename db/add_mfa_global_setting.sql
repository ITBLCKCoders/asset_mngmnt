-- Create asset_mngmnt_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS `asset_mngmnt_settings` (
    `settingID` INT NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT NOT NULL,
    `type` ENUM('string', 'number', 'boolean') NOT NULL DEFAULT 'string',
    `description` TEXT,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` INT NOT NULL DEFAULT 1,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by` INT NOT NULL DEFAULT 1,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`settingID`),
    UNIQUE KEY `uk_settings_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add global MFA setting (enabled by default)
-- This setting controls whether users can add MFA to their accounts
INSERT INTO asset_mngmnt_settings (
    `key`,
    `value`,
    `type`,
    `description`,
    `status`,
    `created_by`,
    `updated_by`
) VALUES (
    'mfa_enabled',
    'true',
    'boolean',
    'Global MFA enable/disable setting. When OFF, users cannot add MFA.',
    'active',
    1,
    1
)
ON DUPLICATE KEY UPDATE
    `value` = VALUES(`value`),
    `updated_at` = NOW(),
    `updated_by` = VALUES(`updated_by`);

-- Verify the setting was added
SELECT * FROM asset_mngmnt_settings WHERE `key` = 'mfa_enabled';
