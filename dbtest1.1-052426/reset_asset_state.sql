-- =============================================================================
-- Reset all assets/builders to Available, remove assignments/returns/transfers,
-- and clear asset timelines so only "Created" audit entries remain.
-- Schema reference: dbtest1.1-052426 (this folder)
-- Database: asset_mngmnt
--
-- WARNING: Destructive. Back up the database before running.
-- =============================================================================

USE asset_mngmnt;

SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS;
SET @OLD_SQL_SAFE_UPDATES = @@SQL_SAFE_UPDATES;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

START TRANSACTION;

TRUNCATE TABLE asset_checklists;
TRUNCATE TABLE transfer_form_assignments;
TRUNCATE TABLE asset_transfer;
TRUNCATE TABLE asset_mngmnt_gate_passes;
TRUNCATE TABLE asset_returns;
TRUNCATE TABLE accountability_forms;
TRUNCATE TABLE asset_transfer_forms;
TRUNCATE TABLE asset_return_forms;
TRUNCATE TABLE asset_assignments;
TRUNCATE TABLE asset_borrow_requests;

UPDATE assets
SET status = 'Available',
    location_id = NULL,
    location_room_id = NULL,
    updated_at = NOW(),
    updated_by = 'SYSTEM_RESET'
WHERE deleted_at IS NULL;

UPDATE asset_builders
SET status = 'Available',
    updated_at = NOW()
WHERE deleted_at IS NULL;

DELETE al
FROM audit_logs al
WHERE al.deleted_at IS NULL
  AND (
    (al.resource_type = 'asset' AND al.action <> 'Created Asset')
    OR (al.resource_type = 'asset_builder' AND al.action <> 'Created Asset Builder')
    OR al.resource_type = 'asset_assignment'
  );

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;
SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;

COMMIT;

SELECT 'Reset completed for dbtest1.1-052426 schema.' AS result;
