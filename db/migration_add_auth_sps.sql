-- Migration: add stored procedures for auth (sessions, password reset, user lookup)
-- Run on asset_mngmnt database

DROP PROCEDURE IF EXISTS `sp_get_user_by_email`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_user_by_email`(IN p_email VARCHAR(255))
BEGIN
  SELECT * FROM users WHERE email = p_email LIMIT 1;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_get_user_by_id`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_user_by_id`(IN p_user_id CHAR(36))
BEGIN
  SELECT userID, email FROM users WHERE userID = p_user_id LIMIT 1;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_get_session_last_activity`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_session_last_activity`(IN p_user_id CHAR(36))
BEGIN
  SELECT last_activity FROM sessions WHERE userID = p_user_id AND expires > NOW() LIMIT 1;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_delete_sessions_by_user`;
DELIMITER ;;
CREATE PROCEDURE `sp_delete_sessions_by_user`(IN p_user_id CHAR(36))
BEGIN
  DELETE FROM sessions WHERE userID = p_user_id;
  SELECT ROW_COUNT() AS deleted_count;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_insert_session`;
DELIMITER ;;
CREATE PROCEDURE `sp_insert_session`(
  IN p_session_id VARCHAR(64),
  IN p_user_id CHAR(36),
  IN p_refresh_token VARCHAR(255),
  IN p_ip VARCHAR(45),
  IN p_user_agent TEXT
)
BEGIN
  INSERT INTO sessions (sessionID, userID, refresh_token, ip, user_agent, last_activity, expires)
  VALUES (p_session_id, p_user_id, p_refresh_token, p_ip, p_user_agent, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY));
  SELECT 1 AS success;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_update_session_activity`;
DELIMITER ;;
CREATE PROCEDURE `sp_update_session_activity`(IN p_user_id CHAR(36))
BEGIN
  UPDATE sessions SET last_activity = NOW() WHERE userID = p_user_id AND expires > NOW();
  SELECT ROW_COUNT() AS affected_rows;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_get_session_by_refresh_token`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_session_by_refresh_token`(IN p_refresh_token VARCHAR(255))
BEGIN
  SELECT * FROM sessions WHERE refresh_token = p_refresh_token AND expires > NOW() LIMIT 1;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_delete_session_by_refresh_token`;
DELIMITER ;;
CREATE PROCEDURE `sp_delete_session_by_refresh_token`(IN p_refresh_token VARCHAR(255))
BEGIN
  DELETE FROM sessions WHERE refresh_token = p_refresh_token;
  SELECT ROW_COUNT() AS deleted_count;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_delete_session_by_id`;
DELIMITER ;;
CREATE PROCEDURE `sp_delete_session_by_id`(IN p_session_id VARCHAR(64))
BEGIN
  DELETE FROM sessions WHERE sessionID = p_session_id;
  SELECT ROW_COUNT() AS deleted_count;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_delete_password_reset_tokens_by_user`;
DELIMITER ;;
CREATE PROCEDURE `sp_delete_password_reset_tokens_by_user`(IN p_user_id CHAR(36))
BEGIN
  DELETE FROM password_reset_tokens WHERE userID = p_user_id;
  SELECT ROW_COUNT() AS deleted_count;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_insert_password_reset_token`;
DELIMITER ;;
CREATE PROCEDURE `sp_insert_password_reset_token`(
  IN p_token VARCHAR(10),
  IN p_user_id CHAR(36)
)
BEGIN
  INSERT INTO password_reset_tokens (token, userID, expires)
  VALUES (p_token, p_user_id, DATE_ADD(NOW(), INTERVAL 15 MINUTE));
  SELECT 1 AS success;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_get_password_reset_token`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_password_reset_token`(IN p_token VARCHAR(10))
BEGIN
  SELECT * FROM password_reset_tokens WHERE token = p_token AND expires > NOW() LIMIT 1;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_extend_password_reset_token`;
DELIMITER ;;
CREATE PROCEDURE `sp_extend_password_reset_token`(IN p_token VARCHAR(10))
BEGIN
  UPDATE password_reset_tokens SET expires = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE token = p_token;
  SELECT ROW_COUNT() AS affected_rows;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_cleanup_expired_auth_data`;
DELIMITER ;;
CREATE PROCEDURE `sp_cleanup_expired_auth_data`()
BEGIN
  DELETE FROM sessions WHERE expires < NOW();
  DELETE FROM sessions WHERE last_activity < DATE_SUB(NOW(), INTERVAL 5 MINUTE);
  DELETE FROM verification_tokens WHERE expires < NOW();
  DELETE FROM password_reset_tokens WHERE expires < NOW();
  SELECT 1 AS success;
END ;;
DELIMITER ;
