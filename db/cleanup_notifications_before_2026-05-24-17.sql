-- Remove notifications older than 2026-05-24 17:00:00 (5:00 PM).
-- Keeps rows where created_at >= '2026-05-24 17:00:00'.
--
-- Schema reference: dblive3v10-11-5-24-26
-- WARNING: Destructive. Back up the database before running.
--
-- Usage (adjust credentials/database as needed):
--   mysql -u root -p asset_mngmnt < db/cleanup_notifications_before_2026-05-24-17.sql

USE asset_mngmnt;

SET @cutoff := '2026-05-24 17:00:00';

SELECT
  COUNT(*) AS notifications_to_delete
FROM notifications
WHERE created_at < @cutoff;

SELECT
  COUNT(*) AS notifications_to_keep
FROM notifications
WHERE created_at >= @cutoff;

START TRANSACTION;

DELETE FROM notifications
WHERE created_at < @cutoff;

COMMIT;

SELECT
  COUNT(*) AS notifications_remaining
FROM notifications;

SELECT 'Notification cleanup completed. Only rows from 2026-05-24 17:00:00 onwards remain.' AS Result;
