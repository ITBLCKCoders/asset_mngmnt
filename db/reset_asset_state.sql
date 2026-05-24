-- =============================================================================
-- Reset all assets/builders to Available, remove assignments/returns/transfers,
-- and clear asset timelines so only "Created" audit entries remain.
-- Schema reference: dbtest1.1-052426
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

-- ---------------------------------------------------------------------------
-- 1. Remove assignment, return, transfer, checklist, and form data
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 2. Reset physical assets to Available
-- ---------------------------------------------------------------------------
UPDATE assets
SET status = 'Available',
    location_id = NULL,
    location_room_id = NULL,
    updated_at = NOW(),
    updated_by = 'SYSTEM_RESET'
WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Reset asset builders to Available
-- ---------------------------------------------------------------------------
UPDATE asset_builders
SET status = 'Available',
    updated_at = NOW()
WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 4. Clear timelines — keep only Created Asset / Created Asset Builder logs
--    (covers asset, asset_builder, and asset_assignment resource types)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 5. Verification (expect 0 for all except created audit logs may remain)
-- ---------------------------------------------------------------------------
SELECT 'asset_assignments' AS tbl, COUNT(*) AS row_count FROM asset_assignments
UNION ALL SELECT 'asset_return_forms', COUNT(*) FROM asset_return_forms
UNION ALL SELECT 'asset_transfer_forms', COUNT(*) FROM asset_transfer_forms
UNION ALL SELECT 'accountability_forms', COUNT(*) FROM accountability_forms
UNION ALL SELECT 'non_created_asset_audit_logs', COUNT(*) FROM audit_logs
  WHERE deleted_at IS NULL
    AND (
      (resource_type = 'asset' AND action <> 'Created Asset')
      OR (resource_type = 'asset_builder' AND action <> 'Created Asset Builder')
      OR resource_type = 'asset_assignment'
    )
UNION ALL SELECT 'assets_not_available', COUNT(*) FROM assets
  WHERE deleted_at IS NULL AND status <> 'Available'
UNION ALL SELECT 'builders_not_available', COUNT(*) FROM asset_builders
  WHERE deleted_at IS NULL AND status <> 'Available';

SELECT status, COUNT(*) AS cnt
FROM assets
WHERE deleted_at IS NULL
GROUP BY status
ORDER BY status;

SELECT status, COUNT(*) AS cnt
FROM asset_builders
WHERE deleted_at IS NULL
GROUP BY status
ORDER BY status;

SELECT 'Reset completed.' AS result;
