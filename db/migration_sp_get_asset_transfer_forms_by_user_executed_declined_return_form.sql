-- Migration: Return executed_at, declined_at, and return_form_id from sp_get_asset_transfer_forms_by_user
-- so clients can show "Completed" / "Declined" correctly (executed_at was never selected before).
-- Run after migration_transfer_hold_and_decline.sql and migration_add_executed_at_asset_transfer_forms.sql.

DROP PROCEDURE IF EXISTS `sp_get_asset_transfer_forms_by_user`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_asset_transfer_forms_by_user`(IN p_user_id CHAR(36))
BEGIN
  SELECT
    atf.formID, atf.form_number, atf.user_id, atf.department_id, atf.location_id,
    atf.location_room_id, atf.new_assigned_user_id, atf.created_by, atf.created_at,
    atf.signed_at, atf.signed_by, atf.signed_digital_signature,
    DATE_FORMAT(atf.process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
    atf.process_digital_signature, atf.transfer_type, atf.received_by,
    atf.return_form_id,
    DATE_FORMAT(atf.executed_at, '%Y-%m-%d %H:%i:%s') AS executed_at,
    DATE_FORMAT(atf.declined_at, '%Y-%m-%d %H:%i:%s') AS declined_at,
    atf.declined_by,
    DATE_FORMAT(atf.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
    atf.dept_head_digital_signature,
    atf.dept_head_signed_by,
    DATE_FORMAT(atf.it_manager_signed_at, '%Y-%m-%d %H:%i:%s') AS it_manager_signed_at,
    atf.it_manager_digital_signature,
    atf.it_manager_signed_by
  FROM asset_transfer_forms atf
  WHERE atf.user_id = p_user_id AND atf.deleted_at IS NULL
  ORDER BY atf.created_at DESC;
END ;;
DELIMITER ;
