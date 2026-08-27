-- =============================================================================
-- Backfill: re-create accountability forms for users whose ALL tangible assets
-- were returned (or transferred) but who still hold intangible assets.
-- -----------------------------------------------------------------------------
-- ROOT CAUSE (pre-fix):
--   handleAccountabilityFormOnAssetReturn in
--   server/src/utils/accountabilityFormOnReturn.ts disabled every accountability
--   form for a user when tangible assets came back, then returned early because
--   asset_assignments.count == 0 (no tangible assets left) WITHOUT checking that
--   the user may still hold ACTIVE intangible assets (stored in the separate
--   intangible_asset_assignments table). Those users ended up with only Disabled
--   forms and NO active form.
--
-- SCOPE: This migration fixes rows that were already affected BEFORE the code
--   fix deploys. Going forward the code fix covers new events automatically.
--
-- SAFETY / IDEMPOTENCY:
--   * Runs only for (user, department) pairs that keep >=1 ACTIVE intangible
--     AND that have a Disabled form AND have NO Pending/Signed form.
--   * Re-running the procedure is a no-op for pairs that now have a
--     Pending/Signed form.
--   * It only INSERTs into accountability_forms; never edits/deletes rows.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) DIAGNOSTIC: preview exactly which (user, department) pairs will be
--    backfilled and how many active intangibles each carries.
-- -----------------------------------------------------------------------------
SELECT iaa.user_id,
       CONCAT(u.first_name, ' ', u.last_name)          AS user_name,
       iaa.department_id,
       d.name                                          AS department_name,
       COUNT(DISTINCT iaa.intangible_asset_id)          AS active_intangible_count
FROM intangible_asset_assignments iaa
JOIN users u ON u.userID = iaa.user_id
LEFT JOIN asset_mngmnt_departments d ON d.departmentID = iaa.department_id
WHERE iaa.status = 'Active'
  AND iaa.deleted_at IS NULL
  AND iaa.department_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM accountability_forms af
    WHERE af.user_id = iaa.user_id
      AND af.status = 'Disabled'
      AND af.deleted_at IS NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM accountability_forms af2
    WHERE af2.user_id = iaa.user_id
      AND af2.department_id = iaa.department_id
      AND af2.status IN ('Pending', 'Signed')
      AND af2.deleted_at IS NULL
  )
GROUP BY iaa.user_id, iaa.department_id, u.first_name, u.last_name, d.name;

-- =============================================================================
-- 1) BACKFILL PROCEDURE
-- -----------------------------------------------------------------------------
-- Creates one new Pending accountability form per affected (user, department)
-- covering the user's still-held intangible assets. The form_number reuses the
-- pair's already-Disabled form as a template: same company/dept/role/date
-- prefix with a bumped, unique 4-digit sequence.
-- =============================================================================
DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_BackfillIntangibleAccountabilityForms`$$

CREATE PROCEDURE `sp_BackfillIntangibleAccountabilityForms`()
BEGIN
  -- -------------------------------------------------------------------------
  -- A) Collect affected (user, department) pairs and their ACTIVE intangibles
  --    as a JSON array of asset objects.
  -- -------------------------------------------------------------------------
  DROP TEMPORARY TABLE IF EXISTS `bb_aff`;
  CREATE TEMPORARY TABLE `bb_aff` AS
  SELECT
    aff.user_id,
    aff.department_id,
    MIN(iaa.location_id)      AS location_id,
    MIN(iaa.location_room_id) AS location_room_id,
    JSON_ARRAYAGG(JSON_OBJECT(
      'id', ia.id, 'code', ia.name, 'name', ia.name,
      'description', IFNULL(ia.description, ''),
      'category', 'Intangible', 'type', IFNULL(ia.type, 'Intangible'),
      'department', d.name, 'serialNo', '', 'modelNo', '', 'brand', ''
    )) AS assets_json
  FROM (
    SELECT DISTINCT iaa.user_id, iaa.department_id
    FROM intangible_asset_assignments iaa
    WHERE iaa.status = 'Active' AND iaa.deleted_at IS NULL
      AND iaa.department_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM accountability_forms af
                  WHERE af.user_id = iaa.user_id AND af.status = 'Disabled' AND af.deleted_at IS NULL)
      AND NOT EXISTS (SELECT 1 FROM accountability_forms af2
                      WHERE af2.user_id = iaa.user_id AND af2.department_id = iaa.department_id
                        AND af2.status IN ('Pending','Signed') AND af2.deleted_at IS NULL)
  ) aff
  JOIN intangible_asset_assignments iaa
    ON iaa.user_id = aff.user_id AND iaa.department_id = aff.department_id
   AND iaa.status = 'Active' AND iaa.deleted_at IS NULL
  JOIN intangible_assets ia ON ia.id = iaa.intangible_asset_id
  LEFT JOIN asset_mngmnt_departments d ON d.departmentID = aff.department_id
  GROUP BY aff.user_id, aff.department_id;

  -- ---------------------------------------------------------------------------
  -- B) Templatize: reuse the affected pair's most recent Disabled form as the
  --    NUMBER TEMPLATE. base = form_number minus its trailing "-NNNN".
  --    Keep its created_by so the replacement is issued by the same person.
  -- ---------------------------------------------------------------------------
  DROP TEMPORARY TABLE IF EXISTS `bb_plan`;
  CREATE TEMPORARY TABLE `bb_plan` AS
  SELECT
    a.user_id,
    a.department_id,
    a.location_id,
    a.location_room_id,
    a.assets_json,
    LEFT(d.form_number, LENGTH(d.form_number) - 5) AS base,
    d.created_by
  FROM bb_aff a
  JOIN (
    SELECT user_id, department_id, form_number, created_by,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, department_id
             ORDER BY created_at DESC, form_number DESC
           ) AS rn
    FROM accountability_forms
    WHERE status = 'Disabled' AND deleted_at IS NULL
  ) d ON d.user_id = a.user_id AND d.department_id = a.department_id AND d.rn = 1;

  DROP TEMPORARY TABLE IF EXISTS `bb_aff`;

  -- ---------------------------------------------------------------------------
  -- C) Final form_number = base + fresh sequence. The sequence picks up after
  --    the current max for that base across ALL existing forms, offset per row
  --    so multiple rows sharing a base stay unique.
  -- ---------------------------------------------------------------------------
  DROP TEMPORARY TABLE IF EXISTS `bb_final`;
  CREATE TEMPORARY TABLE `bb_final` AS
  SELECT
    p.user_id, p.department_id, p.location_id, p.location_room_id,
    p.assets_json, p.created_by,
    CONCAT(
      p.base, '-',
      LPAD(
        (SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(form_number, '-', -1) AS UNSIGNED)), 0)
           FROM accountability_forms
          WHERE form_number LIKE CONCAT(p.base, '-%'))
        + ROW_NUMBER() OVER (PARTITION BY p.base ORDER BY p.user_id),
        4, '0'
      )
    ) AS form_number
  FROM bb_plan p;

  DROP TEMPORARY TABLE IF EXISTS `bb_plan`;

  -- ---------------------------------------------------------------------------
  -- D) Insert. status = Pending so HR/the user can act on them.
  --    asset_id / assignment_id stay NULL (intangible / multi-asset form).
  --    assets_data stores the exact shape the app reads:
  --    { "assets": [ ... ], "assignment_ids": [] }
  -- ---------------------------------------------------------------------------
  INSERT INTO accountability_forms
    (form_number, assignment_id, asset_id, user_id, department_id,
     location_id, location_room_id, status, created_by, assets_data)
  SELECT
    f.form_number, NULL, NULL, f.user_id, f.department_id,
    f.location_id, f.location_room_id, 'Pending', f.created_by,
    JSON_OBJECT('assets', f.assets_json, 'assignment_ids', JSON_ARRAY())
  FROM bb_final f;

  DROP TEMPORARY TABLE IF EXISTS `bb_final`;
END$$

DELIMITER ;

-- =============================================================================
-- 2) RUN THE BACKFILL
-- -----------------------------------------------------------------------------
-- Preview the diagnostic SELECT at the top of the file first, then execute:
--     CALL sp_BackfillIntangibleAccountabilityForms();
-- Afterwards you can drop the procedure (optional):
--     DROP PROCEDURE IF EXISTS `sp_BackfillIntangibleAccountabilityForms`;
-- =============================================================================
