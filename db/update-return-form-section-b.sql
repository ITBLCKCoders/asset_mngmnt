-- ============================================================
-- Script: update-return-form-section-b.sql
-- Purpose: Update all Section B approvals on return form
--          #005-108-1009-062026-0004 (Rutanya Bonayon)
--          - Returner:         Rutanya Bonayon
--          - Dept Head:        Julius Libranda
--          - IT Manager:       Ralph Padilla
-- Author: AI-generated
-- Date:   2026-06-18
-- ============================================================
-- IMPORTANT: The UI/PDF only renders Section B names when
-- the corresponding *_signed_at timestamps are non-NULL.
-- Both the user ID AND timestamp must be set.
-- ============================================================

-- Step 1: Verify the form exists and see current state
SELECT formID, form_number,
       user_id,
       signed_at, signed_by AS current_returner_user_id,
       dept_head_signed_at, dept_head_signed_by AS current_dept_head_user_id,
       it_manager_signed_at, it_manager_signed_by AS current_it_manager_user_id
FROM asset_return_forms
WHERE form_number = '005-108-1009-062026-0004';

-- Step 2: Verify all three target users exist
SELECT userID, CONCAT(first_name, ' ', last_name) AS full_name,
       email, position,
       IF(digital_signature IS NOT NULL AND digital_signature != '', 'YES', 'NO') AS has_digital_sig
FROM users
WHERE userID IN (
  '7fe5c9b0-d7e5-44a3-918d-d099f1c01ca8',  -- Rutanya Bonayon (Returner)
  '3196d5d4-9966-410d-bb80-76a582659c45',  -- Julius Libranda (Dept Head)
  '51835ade-65e8-4b23-9489-3d66872b831d'   -- Ralph Padilla (IT Manager)
);

-- ============================================================
-- UPDATE: Set Section B approvals (user IDs + timestamps)
-- NOTE: digital_signature is set to '' because none of the
--       three users have a digital signature on file.
--       If signatures are needed, upload them via profile,
--       then set the *_digital_signature column.
-- ============================================================
UPDATE asset_return_forms
SET
    -- Returner
    user_id = '7fe5c9b0-d7e5-44a3-918d-d099f1c01ca8',
    signed_at = NOW(),
    signed_by = '7fe5c9b0-d7e5-44a3-918d-d099f1c01ca8',
    signed_digital_signature = '',

    -- Returner's Department Head
    dept_head_signed_at = NOW(),
    dept_head_signed_by = '3196d5d4-9966-410d-bb80-76a582659c45',
    dept_head_digital_signature = '',

    -- IT Manager / IT Department Head
    it_manager_signed_at = NOW(),
    it_manager_signed_by = '51835ade-65e8-4b23-9489-3d66872b831d',
    it_manager_digital_signature = '',

    updated_at = NOW()
WHERE form_number = '005-108-1009-062026-0004';

-- Step 4: Verify the update
SELECT formID, form_number,
       user_id AS returner_user_id,
       signed_at, signed_by,
       dept_head_signed_at, dept_head_signed_by,
       it_manager_signed_at, it_manager_signed_by,
       updated_at
FROM asset_return_forms
WHERE form_number = '005-108-1009-062026-0004';
