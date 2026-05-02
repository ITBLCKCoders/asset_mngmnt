-- Migration: Add MFA/TOTP support to users table
-- Run this against your MySQL database

-- Add MFA columns to users table
ALTER TABLE users 
ADD COLUMN mfa_enabled TINYINT(1) NOT NULL DEFAULT 0,
ADD COLUMN mfa_secret VARCHAR(255) NULL,
ADD COLUMN mfa_verified_at DATETIME NULL,
ADD COLUMN backup_codes TEXT NULL;

-- Create table for MFA backup code usage tracking
CREATE TABLE IF NOT EXISTS mfa_backup_code_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  used_at DATETIME NOT NULL,
  KEY idx_user_id (user_id),
  CONSTRAINT fk_mfa_backup_user FOREIGN KEY (user_id) REFERENCES users (userID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add index for MFA-enabled users lookup
CREATE INDEX idx_mfa_enabled ON users(mfa_enabled);
