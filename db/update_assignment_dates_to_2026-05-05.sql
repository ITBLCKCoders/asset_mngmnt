-- Set all asset assignment dates (and linked accountability display dates) to 2026-05-05.
--
-- Schema reference: dblive3v10-11-5-24-26(1)
--   - asset_assignments.assigned_date  → primary assignment date
--   - accountability_forms.assignment_id → joins asset_assignments for assigned_date in the app
--
-- WARNING: Destructive data change. Back up the database before running.
--
-- Usage:
--   mysql -u root -p asset_mngmnt < db/update_assignment_dates_to_2026-05-05.sql

USE asset_mngmnt;

SET @target_date := '2026-05-05 00:00:00';

-- Preview: assignment dates before update
SELECT
  COUNT(*) AS assignment_rows,
  MIN(assigned_date) AS min_assigned_date,
  MAX(assigned_date) AS max_assigned_date
FROM asset_assignments
WHERE deleted_at IS NULL;

SELECT
  COUNT(*) AS accountability_forms_with_assignment
FROM accountability_forms af
INNER JOIN asset_assignments aa ON af.assignment_id = aa.assignmentID
WHERE af.deleted_at IS NULL
  AND aa.deleted_at IS NULL;

START TRANSACTION;

-- MySQL Workbench safe-update mode requires WHERE on a KEY column (not deleted_at alone).
SET SESSION SQL_SAFE_UPDATES = 0;

-- 1) Asset assignments: assignment date (and created_at when issuance was recorded together)
UPDATE asset_assignments
SET
  assigned_date = @target_date,
  created_at = @target_date,
  updated_at = NOW()
WHERE assignmentID IS NOT NULL
  AND deleted_at IS NULL;

-- 2) Accountability forms: align form issue date for UI/PDF (created_at on form)
--    Assignment date on forms still comes from asset_assignments.assigned_date via assignment_id.
UPDATE accountability_forms
SET
  created_at = @target_date,
  updated_at = NOW()
WHERE formID IS NOT NULL
  AND deleted_at IS NULL;

SET SESSION SQL_SAFE_UPDATES = 1;

COMMIT;

-- Verify after update
SELECT
  COUNT(*) AS assignment_rows,
  MIN(assigned_date) AS min_assigned_date,
  MAX(assigned_date) AS max_assigned_date
FROM asset_assignments
WHERE deleted_at IS NULL;

SELECT
  COUNT(*) AS accountability_forms,
  MIN(created_at) AS min_created_at,
  MAX(created_at) AS max_created_at
FROM accountability_forms
WHERE deleted_at IS NULL;

SELECT 'Assignment and accountability dates updated to 2026-05-05.' AS Result;
