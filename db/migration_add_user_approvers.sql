-- Migration: Add user_approvers table for per-user designated approvers.
-- Run this against your MySQL database.
--
-- NOTE: This is the canonical migration for user-level approvers. It supersedes
-- db/migration_user_approvers.sql (which only added the same table plus now-unused
-- stored procedures; repositories query the table directly). The table creation
-- is idempotent so both files can be applied safely.

-- 1. Create user_approvers table (user-level designated approvers)
CREATE TABLE IF NOT EXISTS user_approvers (
  id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  approver_type ENUM('approver', 'sub_approver') NOT NULL,
  approver_user_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_approver_per_user (user_id, approver_type),
  CONSTRAINT fk_user_approvers_user FOREIGN KEY (user_id) REFERENCES users(userID) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_approvers_approver_user FOREIGN KEY (approver_user_id) REFERENCES users(userID) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Indexes for performance
CREATE INDEX idx_user_approvers_user_id ON user_approvers(user_id);
CREATE INDEX idx_user_approvers_approver_user_id ON user_approvers(approver_user_id);

-- 3. Optional: Migrate existing company_approvers to user_approvers for all users in each company.
--    This gives existing company-level approvers as defaults for all users.
--    Uncomment and run if you want to backfill:
/*
INSERT IGNORE INTO user_approvers (id, user_id, approver_type, approver_user_id)
SELECT
  UUID(),
  u.userID,
  ca.approver_type,
  ca.user_id
FROM company_approvers ca
JOIN users u ON u.company_id = ca.company_id AND u.is_active = 1
WHERE ca.approver_type IN ('approver', 'sub_approver');
*/
