-- Reset passwords for all users of a specific company.
-- Sets every user's password to the provided bcrypt hash and stamps password_last_changed.
--
-- Usage:
--   mysql -u <user> -p asset_mngmnt < db/reset-company-passwords.sql
--   (or paste into your MySQL client / Workbench)
--
-- WARNING: Modifies login credentials for all users of the target company.
-- Back up the database first.

-- Preview affected users before updating:
SELECT userID, email, name
FROM users
WHERE company_id = 'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f';

-- Apply the new password (bcrypt hash is compatible with bcryptjs compare):
-- Temporarily disable Workbench safe update mode (UPDATE filters by company_id,
-- which is not a KEY column), then restore it.
SET SQL_SAFE_UPDATES = 0;

UPDATE users
SET password = '$2b$12$lsYLr2OmQ1YumGPPjJ/0Hu1RbHJYxIvtAE.rHFAW0sWBnw1HKY0t6',
    password_last_changed = NOW()
WHERE company_id = 'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f';

SET SQL_SAFE_UPDATES = 1;
