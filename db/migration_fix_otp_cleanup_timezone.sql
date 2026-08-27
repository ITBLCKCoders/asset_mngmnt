-- Migration: fix sp_cleanup_expired_auth_data timezone mismatch for OTP cleanup
-- Run on asset_mngmnt and asset_mngmnt_prod databases
--
-- Root cause: verification_tokens.expires and mfa_recovery_tokens.expires are stored
-- in UTC (DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE)) but the cleanup procedure
-- compared them against local NOW(). On a non-UTC MySQL server (SYSTEM time zone,
-- e.g. UTC+8) every fresh token appeared already expired and was deleted on each
-- cleanup run (server startup + every 5 minutes), causing "Invalid or expired OTP"
-- for email verification codes that were still valid.
--
-- password_reset_tokens and sessions remain NOW()-based and are left unchanged.

DROP PROCEDURE IF EXISTS `sp_cleanup_expired_auth_data`;
DELIMITER ;;
CREATE PROCEDURE `sp_cleanup_expired_auth_data`()
BEGIN
  DELETE FROM sessions WHERE expires < NOW();
  DELETE FROM sessions WHERE last_activity < DATE_SUB(NOW(), INTERVAL 5 MINUTE);
  DELETE FROM verification_tokens WHERE expires < UTC_TIMESTAMP();
  DELETE FROM password_reset_tokens WHERE expires < NOW();
  DELETE FROM mfa_recovery_tokens WHERE expires < UTC_TIMESTAMP();
  SELECT 1 AS success;
END ;;
DELIMITER ;
