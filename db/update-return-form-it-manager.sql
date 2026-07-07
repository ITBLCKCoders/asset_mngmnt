-- ============================================================
-- Script: update-return-form-it-manager.sql
-- Purpose: Change IT Manager / IT Department Head on return form
--          #005-108-1009-062026-0004 to Ralph Padilla
--          (userID: 51835ade-65e8-4b23-9489-3d66872b831d)
-- Author: AI-generated
-- Date:   2026-06-18
-- ============================================================

-- Step 1: Verify the form exists and see current IT Manager
SELECT formID, form_number,
       it_manager_signed_at,
       it_manager_signed_by AS old_it_manager_user_id,
       it_manager_digital_signature IS NOT NULL AS has_digital_sig
FROM asset_return_forms
WHERE form_number = '005-108-1009-062026-0004';

-- Step 2: Verify the target user exists and get their info
SELECT userID, CONCAT(first_name, ' ', last_name) AS full_name,
       email,
       digital_signature IS NOT NULL AS has_digital_sig
FROM users
WHERE userID = '51835ade-65e8-4b23-9489-3d66872b831d';

-- ============================================================
-- UPDATE: Change IT Manager to Ralph Padilla
-- NOTE: digital_signature is set to '' because Ralph Padilla
--       does not have a digital signature on file.
--       If a signature is needed, upload one first via profile,
--       then run STEP 4 to re-apply.
-- ============================================================
UPDATE asset_return_forms
SET it_manager_signed_by = '51835ade-65e8-4b23-9489-3d66872b831d',
    it_manager_digital_signature = '',
    updated_at = NOW()
WHERE form_number = '005-108-1009-062026-0004';

-- Step 4 (optional): If Ralph later uploads a digital signature,
-- run this to apply it:
-- UPDATE asset_return_forms
-- SET it_manager_digital_signature = (
--       SELECT digital_signature FROM users
--       WHERE userID = '51835ade-65e8-4b23-9489-3d66872b831d'
--     ),
--     updated_at = NOW()
-- WHERE form_number = '005-108-1009-062026-0004';

-- Step 5: Verify the update
SELECT formID, form_number,
       it_manager_signed_at,
       it_manager_signed_by AS new_it_manager_user_id,
       it_manager_digital_signature IS NOT NULL AS has_digital_sig,
       updated_at
FROM asset_return_forms
WHERE form_number = '005-108-1009-062026-0004';
