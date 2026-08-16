-- Migration: Update sp_get_asset_transfer_form_by_id to return dept_head and it_manager approval columns.
-- Run after migration_add_transfer_form_approvals.sql so asset_transfer_forms has those columns.

DROP PROCEDURE IF EXISTS `sp_get_asset_transfer_form_by_id`;
DELIMITER ;;
CREATE PROCEDURE `sp_get_asset_transfer_form_by_id`(IN p_form_id CHAR(36))
BEGIN
  SELECT
    atf.formID, atf.form_number, atf.user_id, atf.department_id, atf.location_id,
    atf.location_room_id, atf.new_assigned_user_id, atf.created_by, atf.created_at,
    atf.signed_at, atf.signed_by, atf.signed_digital_signature,
    DATE_FORMAT(atf.process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
    atf.process_digital_signature, atf.transfer_type, atf.received_by,
    atf.return_form_id,
    DATE_FORMAT(atf.dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
    atf.dept_head_digital_signature,
    atf.dept_head_signed_by,
    DATE_FORMAT(atf.it_manager_signed_at, '%Y-%m-%d %H:%i:%s') AS it_manager_signed_at,
    atf.it_manager_digital_signature,
    atf.it_manager_signed_by
  FROM asset_transfer_forms atf
  WHERE atf.formID = p_form_id AND atf.deleted_at IS NULL
  LIMIT 1;
END ;;
DELIMITER ;
