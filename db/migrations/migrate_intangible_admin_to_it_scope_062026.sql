-- =============================================================================
-- Migration: Intangible Admin scope → IT scope + merge accountability form
-- =============================================================================
--
-- PURPOSE
--   1. Reclassify all intangible_assets with type 'Admin scope' to 'IT scope'.
--   2. Merge every asset from admin accountability form 005-103-6012-062026-0002
--      into the same user's active IT accountability form (form_number contains
--      '-1021-'), then disable the admin form.
--
-- EXECUTION NOTES (read before running)
--   • BACK UP the database first.
--   • Run the PRE-RUN CHECKLIST section below on live and confirm both forms
--     exist for the same user before executing the migration block.
--   • The admin form 005-103-6012-062026-0002 may not exist in older dumps;
--     the script aborts safely if either form is missing.
--   • If the user has multiple active IT forms, the most recently created one
--     is used as the merge target.
--   • Run as a user with UPDATE privileges on intangible_assets and
--     accountability_forms.
--
-- =============================================================================

USE `asset_mngmnt`;

SET collation_connection = 'utf8mb4_unicode_ci';
-- -----------------------------------------------------------------------------
SET @admin_form_number = '005-103-6012-062026-0002' COLLATE utf8mb4_unicode_ci;
SET @it_asset_code     = '1021' COLLATE utf8mb4_unicode_ci;
SET @admin_asset_code  = '6012' COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- PRE-RUN CHECKLIST (run manually; review output before migration)
-- -----------------------------------------------------------------------------

SELECT '=== PRE-RUN: Admin form ===' AS step;
SELECT formID, form_number, user_id, status,
       JSON_LENGTH(assets_data, '$.assets') AS asset_count,
       assets_data
FROM accountability_forms
WHERE form_number COLLATE utf8mb4_unicode_ci = @admin_form_number COLLATE utf8mb4_unicode_ci
  AND deleted_at IS NULL;

SELECT '=== PRE-RUN: Target IT form(s) for same user ===' AS step;
SELECT af.formID, af.form_number, af.user_id, af.status,
       JSON_LENGTH(af.assets_data, '$.assets') AS asset_count,
       af.created_at
FROM accountability_forms af
WHERE af.user_id = (
        SELECT user_id
        FROM accountability_forms
        WHERE form_number COLLATE utf8mb4_unicode_ci = @admin_form_number COLLATE utf8mb4_unicode_ci
          AND deleted_at IS NULL
        LIMIT 1
      )
  AND af.form_number COLLATE utf8mb4_unicode_ci LIKE CONCAT('%-', @it_asset_code, '-%') COLLATE utf8mb4_unicode_ci
  AND af.status NOT IN ('Disabled', 'Revoked', 'Declined')
  AND af.deleted_at IS NULL
ORDER BY af.created_at DESC;

SELECT '=== PRE-RUN: Intangible assets on Admin scope ===' AS step;
SELECT COUNT(*) AS admin_scope_count
FROM intangible_assets
WHERE type = 'Admin scope';

-- -----------------------------------------------------------------------------
-- MIGRATION (transaction-wrapped)
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_migrate_intangible_admin_to_it_scope`;

DELIMITER $$

CREATE PROCEDURE `sp_migrate_intangible_admin_to_it_scope`()
BEGIN
  DECLARE v_admin_form_id   CHAR(36);
  DECLARE v_it_form_id      CHAR(36);
  DECLARE v_user_id         CHAR(36);
  DECLARE v_company_id      CHAR(36);
  DECLARE v_it_dept_name    VARCHAR(255);
  DECLARE v_admin_assets    JSON;
  DECLARE v_it_assets       JSON;
  DECLARE v_merged_assets   JSON;
  DECLARE v_merged_ids      JSON;
  DECLARE v_merged_data     JSON;
  DECLARE v_missing_count   INT DEFAULT 0;
  DECLARE v_admin_scope_before INT DEFAULT 0;
  DECLARE v_admin_scope_after  INT DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  -- Align with table/column collation (avoids 1267 vs connection utf8mb4_0900_ai_ci)
  SET collation_connection = 'utf8mb4_unicode_ci';

  -- ----- Part 1: bulk reclassify intangible assets -----
  SELECT COUNT(*) INTO v_admin_scope_before
  FROM intangible_assets
  WHERE type = 'Admin scope';

  START TRANSACTION;

  UPDATE intangible_assets
  SET type = 'IT scope',
      updated_at = NOW()
  WHERE type = 'Admin scope';

  -- ----- Part 2: resolve forms (same user) -----
  SELECT af.formID, af.user_id, af.assets_data
    INTO v_admin_form_id, v_user_id, v_admin_assets
  FROM accountability_forms af
  WHERE af.form_number COLLATE utf8mb4_unicode_ci = @admin_form_number COLLATE utf8mb4_unicode_ci
    AND af.deleted_at IS NULL
  LIMIT 1;

  IF v_admin_form_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Admin accountability form 005-103-6012-062026-0002 not found';
  END IF;

  IF v_admin_assets IS NULL OR JSON_TYPE(v_admin_assets) = 'NULL' THEN
    SET v_admin_assets = JSON_OBJECT('assets', JSON_ARRAY(), 'assignment_ids', JSON_ARRAY());
  END IF;

  IF JSON_EXTRACT(v_admin_assets, '$.assets') IS NULL THEN
    SET v_admin_assets = JSON_SET(v_admin_assets, '$.assets', JSON_ARRAY());
  END IF;

  SELECT af.formID, af.assets_data
    INTO v_it_form_id, v_it_assets
  FROM accountability_forms af
  WHERE af.user_id = v_user_id
    AND af.form_number COLLATE utf8mb4_unicode_ci LIKE CONCAT('%-', @it_asset_code, '-%') COLLATE utf8mb4_unicode_ci
    AND af.status NOT IN ('Disabled', 'Revoked', 'Declined')
    AND af.deleted_at IS NULL
  ORDER BY af.created_at DESC
  LIMIT 1;

  IF v_it_form_id IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'No active IT accountability form (-1021-) found for the same user';
  END IF;

  IF v_it_assets IS NULL OR JSON_TYPE(v_it_assets) = 'NULL' THEN
    SET v_it_assets = JSON_OBJECT('assets', JSON_ARRAY(), 'assignment_ids', JSON_ARRAY());
  END IF;

  IF JSON_EXTRACT(v_it_assets, '$.assets') IS NULL THEN
    SET v_it_assets = JSON_SET(v_it_assets, '$.assets', JSON_ARRAY());
  END IF;

  -- Resolve IT department name for intangible asset JSON updates
  SELECT u.company_id INTO v_company_id
  FROM users u
  WHERE u.userID = v_user_id
  LIMIT 1;

  SELECT d.name INTO v_it_dept_name
  FROM asset_mngmnt_departments d
  WHERE d.company_id = v_company_id
    AND d.code = '108'
    AND d.deleted_at IS NULL
  LIMIT 1;

  IF v_it_dept_name IS NULL THEN
    -- Fallback: any department whose name classifies as IT for this company
    SELECT d.name INTO v_it_dept_name
    FROM asset_mngmnt_departments d
    WHERE d.company_id = v_company_id
      AND d.deleted_at IS NULL
      AND (
        LOWER(d.name) LIKE '%information technology%'
        OR LOWER(d.name) LIKE '%it department%'
        OR (LOWER(d.name) LIKE '%it%' AND LOWER(d.name) NOT LIKE '%admin%')
      )
    ORDER BY d.created_at ASC
    LIMIT 1;
  END IF;

  -- ----- Part 2b: merge assets (IT existing + admin-only, by id) -----
  SELECT COALESCE(JSON_ARRAYAGG(src.asset_obj), JSON_ARRAY())
    INTO v_merged_assets
  FROM (
    -- Keep all assets already on the IT form
    SELECT it_row.asset_obj
    FROM JSON_TABLE(
      v_it_assets,
      '$.assets[*]' COLUMNS(asset_obj JSON PATH '$')
    ) AS it_row

    UNION ALL

    -- Append admin assets not already on the IT form
    SELECT
      CASE
        WHEN JSON_UNQUOTE(JSON_EXTRACT(admin_row.asset_obj, '$.category')) = 'Intangible'
          OR EXISTS (
            SELECT 1
            FROM intangible_assets ia
            WHERE ia.id = JSON_UNQUOTE(JSON_EXTRACT(admin_row.asset_obj, '$.id'))
          )
        THEN JSON_SET(
               JSON_SET(admin_row.asset_obj, '$.type', 'IT scope'),
               '$.department', COALESCE(v_it_dept_name, JSON_UNQUOTE(JSON_EXTRACT(admin_row.asset_obj, '$.department')))
             )
        ELSE admin_row.asset_obj
      END AS asset_obj
    FROM JSON_TABLE(
      v_admin_assets,
      '$.assets[*]' COLUMNS(asset_obj JSON PATH '$')
    ) AS admin_row
    WHERE JSON_UNQUOTE(JSON_EXTRACT(admin_row.asset_obj, '$.id')) NOT IN (
      SELECT JSON_UNQUOTE(JSON_EXTRACT(it_existing.asset_obj, '$.id'))
      FROM JSON_TABLE(
        v_it_assets,
        '$.assets[*]' COLUMNS(asset_obj JSON PATH '$')
      ) AS it_existing
      WHERE JSON_UNQUOTE(JSON_EXTRACT(it_existing.asset_obj, '$.id')) IS NOT NULL
    )
  ) AS src;

  -- Merge assignment_ids (union, dedupe)
  SELECT COALESCE(JSON_ARRAYAGG(aid.assignment_id), JSON_ARRAY())
    INTO v_merged_ids
  FROM (
    SELECT DISTINCT JSON_UNQUOTE(JSON_EXTRACT(j.value, '$')) AS assignment_id
    FROM JSON_TABLE(
      COALESCE(JSON_EXTRACT(v_it_assets, '$.assignment_ids'), JSON_ARRAY()),
      '$[*]' COLUMNS(value JSON PATH '$')
    ) AS j
    WHERE JSON_UNQUOTE(JSON_EXTRACT(j.value, '$')) IS NOT NULL
      AND JSON_UNQUOTE(JSON_EXTRACT(j.value, '$')) != ''

    UNION

    SELECT DISTINCT JSON_UNQUOTE(JSON_EXTRACT(j.value, '$')) AS assignment_id
    FROM JSON_TABLE(
      COALESCE(JSON_EXTRACT(v_admin_assets, '$.assignment_ids'), JSON_ARRAY()),
      '$[*]' COLUMNS(value JSON PATH '$')
    ) AS j
    WHERE JSON_UNQUOTE(JSON_EXTRACT(j.value, '$')) IS NOT NULL
      AND JSON_UNQUOTE(JSON_EXTRACT(j.value, '$')) != ''
  ) AS aid
  WHERE aid.assignment_id IS NOT NULL
    AND aid.assignment_id != '';

  -- Preserve any extra top-level keys from the IT form (e.g. form_origin)
  SET v_merged_data = v_it_assets;
  SET v_merged_data = JSON_SET(v_merged_data, '$.assets', v_merged_assets);
  SET v_merged_data = JSON_SET(v_merged_data, '$.assignment_ids', v_merged_ids);

  -- ----- Acceptance check: every admin asset id must exist on merged IT data -----
  SELECT COUNT(*) INTO v_missing_count
  FROM JSON_TABLE(
    v_admin_assets,
    '$.assets[*]' COLUMNS(asset_id VARCHAR(36) PATH '$.id')
  ) AS admin_ids
  WHERE admin_ids.asset_id IS NOT NULL
    AND admin_ids.asset_id NOT IN (
      SELECT JSON_UNQUOTE(JSON_EXTRACT(m.asset_obj, '$.id'))
      FROM JSON_TABLE(
        v_merged_data,
        '$.assets[*]' COLUMNS(asset_obj JSON PATH '$')
      ) AS m
      WHERE JSON_UNQUOTE(JSON_EXTRACT(m.asset_obj, '$.id')) IS NOT NULL
    );

  IF v_missing_count > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Merge validation failed: admin form assets missing from IT form after merge';
  END IF;

  -- ----- Part 2c: apply updates -----
  UPDATE accountability_forms
  SET assets_data = v_merged_data,
      updated_at = NOW()
  WHERE formID = v_it_form_id;

  -- MySQL 1093: cannot UPDATE intangible_assets while selecting from it in the same statement.
  DROP TEMPORARY TABLE IF EXISTS tmp_merged_intangible_ids;
  CREATE TEMPORARY TABLE tmp_merged_intangible_ids (
    asset_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL PRIMARY KEY
  );

  INSERT INTO tmp_merged_intangible_ids (asset_id)
  SELECT DISTINCT JSON_UNQUOTE(JSON_EXTRACT(m.asset_obj, '$.id'))
  FROM JSON_TABLE(
    v_merged_data,
    '$.assets[*]' COLUMNS(asset_obj JSON PATH '$')
  ) AS m
  WHERE JSON_UNQUOTE(JSON_EXTRACT(m.asset_obj, '$.category')) = 'Intangible';

  INSERT IGNORE INTO tmp_merged_intangible_ids (asset_id)
  SELECT ia.id
  FROM intangible_assets ia
  INNER JOIN JSON_TABLE(
    v_merged_data,
    '$.assets[*]' COLUMNS(asset_id VARCHAR(36) PATH '$.id')
  ) AS merged ON ia.id = merged.asset_id;

  UPDATE intangible_assets ia
  INNER JOIN tmp_merged_intangible_ids t ON ia.id = t.asset_id
  SET ia.type = 'IT scope',
      ia.updated_at = NOW();

  DROP TEMPORARY TABLE IF EXISTS tmp_merged_intangible_ids;

  UPDATE accountability_forms
  SET status = 'Disabled',
      updated_at = NOW()
  WHERE formID = v_admin_form_id;

  SELECT COUNT(*) INTO v_admin_scope_after
  FROM intangible_assets
  WHERE type = 'Admin scope';

  COMMIT;

  -- ----- Post-run summary (visible after CALL) -----
  SELECT 'Migration completed successfully' AS status;
  SELECT v_admin_form_id   AS admin_form_id;
  SELECT @admin_form_number AS admin_form_number;
  SELECT v_it_form_id      AS it_form_id;
  SELECT v_user_id         AS user_id;
  SELECT v_admin_scope_before AS admin_scope_intangibles_before;
  SELECT v_admin_scope_after  AS admin_scope_intangibles_after;
  SELECT v_missing_count   AS missing_assets_after_merge;

END$$

DELIMITER ;

-- Execute migration
CALL sp_migrate_intangible_admin_to_it_scope();

DROP PROCEDURE IF EXISTS `sp_migrate_intangible_admin_to_it_scope`;

-- -----------------------------------------------------------------------------
-- POST-RUN VERIFICATION
-- (Set helper vars for queries below)
-- -----------------------------------------------------------------------------
SELECT @verify_user_id := user_id
FROM accountability_forms
WHERE form_number COLLATE utf8mb4_unicode_ci = @admin_form_number COLLATE utf8mb4_unicode_ci
  AND deleted_at IS NULL
LIMIT 1;

SELECT @verify_it_form_id := formID,
       @verify_it_assets_data := assets_data
FROM accountability_forms
WHERE user_id = @verify_user_id
  AND form_number COLLATE utf8mb4_unicode_ci LIKE CONCAT('%-', @it_asset_code, '-%') COLLATE utf8mb4_unicode_ci
  AND status NOT IN ('Disabled', 'Revoked', 'Declined')
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 1;

SELECT @verify_admin_assets_data := assets_data
FROM accountability_forms
WHERE form_number COLLATE utf8mb4_unicode_ci = @admin_form_number COLLATE utf8mb4_unicode_ci
  AND deleted_at IS NULL
LIMIT 1;

SELECT '=== POST-RUN: Admin form status (expect Disabled) ===' AS step;
SELECT formID, form_number, user_id, status,
       JSON_LENGTH(assets_data, '$.assets') AS asset_count
FROM accountability_forms
WHERE form_number COLLATE utf8mb4_unicode_ci = @admin_form_number COLLATE utf8mb4_unicode_ci;

SELECT '=== POST-RUN: IT form after merge ===' AS step;
SELECT af.formID, af.form_number, af.user_id, af.status,
       JSON_LENGTH(af.assets_data, '$.assets') AS asset_count,
       af.assets_data
FROM accountability_forms af
WHERE af.user_id = (
        SELECT user_id
        FROM accountability_forms
        WHERE form_number COLLATE utf8mb4_unicode_ci = @admin_form_number COLLATE utf8mb4_unicode_ci
        LIMIT 1
      )
  AND af.form_number COLLATE utf8mb4_unicode_ci LIKE CONCAT('%-', @it_asset_code, '-%') COLLATE utf8mb4_unicode_ci
  AND af.status NOT IN ('Disabled', 'Revoked', 'Declined')
  AND af.deleted_at IS NULL
ORDER BY af.created_at DESC
LIMIT 1;

SELECT '=== POST-RUN: Acceptance check — admin assets missing from IT form (expect 0 rows) ===' AS step;
SELECT admin_jt.asset_id AS missing_asset_id
FROM JSON_TABLE(
  @verify_admin_assets_data,
  '$.assets[*]' COLUMNS(asset_id VARCHAR(36) PATH '$.id')
) AS admin_jt
WHERE admin_jt.asset_id IS NOT NULL
  AND admin_jt.asset_id NOT IN (
    SELECT JSON_UNQUOTE(JSON_EXTRACT(it_row.asset_obj, '$.id'))
    FROM JSON_TABLE(
      @verify_it_assets_data,
      '$.assets[*]' COLUMNS(asset_obj JSON PATH '$')
    ) AS it_row
    WHERE JSON_UNQUOTE(JSON_EXTRACT(it_row.asset_obj, '$.id')) IS NOT NULL
  );

SELECT '=== POST-RUN: Remaining Admin scope intangible assets (expect 0) ===' AS step;
SELECT COUNT(*) AS admin_scope_count
FROM intangible_assets
WHERE type = 'Admin scope';

SELECT '=== POST-RUN: Intangible assets on merged IT form ===' AS step;
SELECT JSON_UNQUOTE(JSON_EXTRACT(m.asset_obj, '$.id'))   AS asset_id,
       JSON_UNQUOTE(JSON_EXTRACT(m.asset_obj, '$.name'))  AS asset_name,
       JSON_UNQUOTE(JSON_EXTRACT(m.asset_obj, '$.type'))  AS asset_type,
       JSON_UNQUOTE(JSON_EXTRACT(m.asset_obj, '$.category')) AS category
FROM (
  SELECT af.assets_data
  FROM accountability_forms af
  WHERE af.user_id = (
          SELECT user_id
          FROM accountability_forms
          WHERE form_number COLLATE utf8mb4_unicode_ci = @admin_form_number COLLATE utf8mb4_unicode_ci
          LIMIT 1
        )
    AND af.form_number COLLATE utf8mb4_unicode_ci LIKE CONCAT('%-', @it_asset_code, '-%') COLLATE utf8mb4_unicode_ci
    AND af.status NOT IN ('Disabled', 'Revoked', 'Declined')
    AND af.deleted_at IS NULL
  ORDER BY af.created_at DESC
  LIMIT 1
) AS it_target
CROSS JOIN JSON_TABLE(
  it_target.assets_data,
  '$.assets[*]' COLUMNS(asset_obj JSON PATH '$')
) AS m
WHERE JSON_UNQUOTE(JSON_EXTRACT(m.asset_obj, '$.category')) = 'Intangible'
   OR EXISTS (
     SELECT 1
     FROM intangible_assets ia
     WHERE ia.id = JSON_UNQUOTE(JSON_EXTRACT(m.asset_obj, '$.id'))
   );
