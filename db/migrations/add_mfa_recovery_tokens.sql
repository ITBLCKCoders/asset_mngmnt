-- Migration: Add MFA Recovery Tokens Table
-- This table stores temporary OTP tokens for email-based MFA recovery
-- When users lose access to their authenticator, they can request an email OTP to complete login

CREATE TABLE IF NOT EXISTS mfa_recovery_tokens (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token VARCHAR(6) NOT NULL,
  expires DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(userID) ON DELETE CASCADE,
  UNIQUE KEY unique_user_recovery (user_id),
  INDEX idx_expires (expires),
  INDEX idx_user_token (user_id, token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
