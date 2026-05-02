-- Add security settings to asset_mngmnt_settings table
-- Migration: add_security_settings

-- Password Policy Settings
INSERT INTO asset_mngmnt_settings (`key`, `value`, `type`, `description`, `status`, `created_by`, `updated_by`)
VALUES 
  ('password_min_length', '8', 'number', 'Minimum password length requirement', 'active', 1, 1),
  ('password_require_uppercase', 'true', 'boolean', 'Require uppercase letters in password', 'active', 1, 1),
  ('password_require_lowercase', 'true', 'boolean', 'Require lowercase letters in password', 'active', 1, 1),
  ('password_require_numbers', 'true', 'boolean', 'Require numbers in password', 'active', 1, 1),
  ('password_require_special', 'false', 'boolean', 'Require special characters in password', 'active', 1, 1),
  ('password_expiration_days', '90', 'number', 'Password expiration period in days (0 = never expires)', 'active', 1, 1)
ON DUPLICATE KEY UPDATE
  `value` = VALUES(`value`),
  `updated_at` = NOW(),
  `updated_by` = VALUES(`updated_by`);

-- Account Security Settings
INSERT INTO asset_mngmnt_settings (`key`, `value`, `type`, `description`, `status`, `created_by`, `updated_by`)
VALUES 
  ('max_login_attempts', '5', 'number', 'Maximum number of failed login attempts before lockout', 'active', 1, 1),
  ('lockout_duration_minutes', '30', 'number', 'Initial lockout duration in minutes (progressive lockout adds 10 mins per subsequent lockout)', 'active', 1, 1),
  ('session_timeout_minutes', '60', 'number', 'Session inactivity timeout in minutes', 'active', 1, 1)
ON DUPLICATE KEY UPDATE
  `value` = VALUES(`value`),
  `updated_at` = NOW(),
  `updated_by` = VALUES(`updated_by`);

-- Audit Logging Setting
INSERT INTO asset_mngmnt_settings (`key`, `value`, `type`, `description`, `status`, `created_by`, `updated_by`)
VALUES 
  ('audit_logging_enabled', 'true', 'boolean', 'Enable/disable audit logging. When disabled, stops creating new audit logs.', 'active', 1, 1)
ON DUPLICATE KEY UPDATE
  `value` = VALUES(`value`),
  `updated_at` = NOW(),
  `updated_by` = VALUES(`updated_by`);

-- Verify the settings were added
SELECT * FROM asset_mngmnt_settings WHERE `key` IN (
  'password_min_length',
  'password_require_uppercase',
  'password_require_lowercase',
  'password_require_numbers',
  'password_require_special',
  'password_expiration_days',
  'max_login_attempts',
  'lockout_duration_minutes',
  'session_timeout_minutes',
  'audit_logging_enabled'
) ORDER BY `key`;
