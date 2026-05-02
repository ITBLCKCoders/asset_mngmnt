-- Migration: add stored procedures for notifications and audit
-- Run on asset_mngmnt database

DROP PROCEDURE IF EXISTS `sp_get_notifications_count`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_notifications_count`(IN p_user_id CHAR(36))
BEGIN
  SELECT COUNT(*) AS count
  FROM notifications
  WHERE user_id = p_user_id AND deleted_at IS NULL;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_get_notifications`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_notifications`(
  IN p_user_id CHAR(36),
  IN p_status VARCHAR(20),
  IN p_limit INT,
  IN p_offset INT
)
BEGIN
  SELECT
    notificationID AS id,
    title,
    message AS description,
    type,
    status,
    data,
    created_at AS timestamp
  FROM notifications
  WHERE user_id = p_user_id AND deleted_at IS NULL
    AND (p_status IS NULL OR status = p_status)
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_mark_notification_read`;
DELIMITER ;;
CREATE PROCEDURE `sp_mark_notification_read`(
  IN p_notification_id CHAR(36),
  IN p_user_id CHAR(36)
)
BEGIN
  UPDATE notifications
  SET status = 'read', updated_at = NOW()
  WHERE notificationID = p_notification_id AND user_id = p_user_id AND deleted_at IS NULL;
  SELECT ROW_COUNT() AS affected_rows;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_create_audit_log`;
DELIMITER ;;
CREATE PROCEDURE `sp_create_audit_log`(
  IN p_user_id VARCHAR(36),
  IN p_action VARCHAR(255),
  IN p_resource_type VARCHAR(100),
  IN p_resource_id VARCHAR(255),
  IN p_resource_name VARCHAR(255),
  IN p_details TEXT,
  IN p_old_values TEXT,
  IN p_new_values TEXT,
  IN p_ip_address VARCHAR(45),
  IN p_user_agent TEXT,
  IN p_company_id CHAR(36)
)
BEGIN
  INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id, resource_name,
    details, old_values, new_values, ip_address, user_agent, company_id
  ) VALUES (
    p_user_id, p_action, p_resource_type, p_resource_id, p_resource_name,
    p_details, p_old_values, p_new_values, p_ip_address, p_user_agent, p_company_id
  );
  SELECT LAST_INSERT_ID() AS auditID;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_get_audit_logs_count`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_audit_logs_count`()
BEGIN
  SELECT COUNT(*) AS total FROM audit_logs WHERE deleted_at IS NULL;
END ;;
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_get_audit_logs`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_audit_logs`(
  IN p_limit INT,
  IN p_offset INT
)
BEGIN
  SELECT
    al.auditID,
    al.created_at,
    al.user_id,
    al.action,
    al.resource_type,
    al.resource_id,
    al.resource_name,
    al.details,
    al.old_values,
    al.new_values,
    al.ip_address,
    al.user_agent,
    al.company_id,
    CONCAT(u.first_name, ' ', u.last_name) AS user_name,
    u.email AS user_email
  FROM audit_logs al
  LEFT JOIN users u ON al.user_id = u.userID
  WHERE al.deleted_at IS NULL
  ORDER BY al.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END ;;
DELIMITER ;
