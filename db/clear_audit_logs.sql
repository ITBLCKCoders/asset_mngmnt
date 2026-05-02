-- Clear all audit logs from the database
USE asset_mngmnt;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE audit_logs;

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Audit logs cleared successfully' AS message;
