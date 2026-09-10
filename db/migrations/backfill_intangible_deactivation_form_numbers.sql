-- Backfill existing intangible deactivation form settings and numbers.
--
-- This migration is intentionally separate from the schema migration because it
-- changes historical form_number values. Apply it only after reviewing the
-- backup table and the preview query below.

-- 1. Ensure every company has a settings row.
INSERT INTO accountability_form_settings (
  company_id,
  company_format,
  department_format,
  deactivation_form_code,
  deactivation_department_format,
  deactivation_include_date,
  deactivation_date_format,
  clearance_form_code,
  clearance_department_format,
  clearance_include_date,
  clearance_date_format,
  include_date,
  date_format
)
SELECT
  c.companyID,
  COALESCE(afs.company_format, 'code'),
  COALESCE(afs.department_format, 'none'),
  COALESCE(afs.deactivation_form_code, 'IDF'),
  COALESCE(afs.deactivation_department_format, 'code'),
  COALESCE(afs.deactivation_include_date, 1),
  COALESCE(afs.deactivation_date_format, 'MMYYYY'),
  COALESCE(afs.clearance_form_code, 'CLR'),
  COALESCE(afs.clearance_department_format, 'code'),
  COALESCE(afs.clearance_include_date, 1),
  COALESCE(afs.clearance_date_format, 'MMYYYY'),
  COALESCE(afs.include_date, 1),
  COALESCE(afs.date_format, 'MMYYYY')
FROM companies c
LEFT JOIN accountability_form_settings afs
  ON afs.company_id = c.companyID AND afs.deleted_at IS NULL
WHERE c.deleted_at IS NULL
  AND afs.id IS NULL;

-- 2. Backfill missing values on existing settings rows without overwriting
--    company-specific values already configured by an administrator.
UPDATE accountability_form_settings
SET
  deactivation_form_code = COALESCE(NULLIF(deactivation_form_code, ''), 'IDF'),
  deactivation_department_format = COALESCE(deactivation_department_format, 'code'),
  deactivation_include_date = COALESCE(deactivation_include_date, 1),
  deactivation_date_format = COALESCE(deactivation_date_format, 'MMYYYY'),
  clearance_form_code = COALESCE(NULLIF(clearance_form_code, ''), 'CLR'),
  clearance_department_format = COALESCE(clearance_department_format, 'code'),
  clearance_include_date = COALESCE(clearance_include_date, 1),
  clearance_date_format = COALESCE(clearance_date_format, 'MMYYYY')
WHERE id <> ''
  AND deleted_at IS NULL;

-- 3. Back up every existing deactivation form before changing its number.
CREATE TABLE IF NOT EXISTS intangible_deactivation_forms_backfill_20260910
LIKE intangible_deactivation_forms;

INSERT IGNORE INTO intangible_deactivation_forms_backfill_20260910
SELECT * FROM intangible_deactivation_forms;

-- 4. Build the new number for each company-linked historical form.
--    The sequence is independent per company and calendar year.
DROP TEMPORARY TABLE IF EXISTS tmp_intangible_deactivation_form_backfill;
CREATE TEMPORARY TABLE tmp_intangible_deactivation_form_backfill AS
SELECT
  f.formID,
  CONCAT_WS('-',
    CASE
      WHEN s.company_format = 'prefix' THEN NULLIF(c.prefix, '')
      WHEN s.company_format = 'none' THEN NULL
      ELSE NULLIF(c.code, '')
    END,
    CASE
      WHEN s.deactivation_department_format = 'prefix' THEN NULLIF(hr.prefix, '')
      WHEN s.deactivation_department_format = 'none' THEN NULL
      ELSE NULLIF(hr.code, '')
    END,
    COALESCE(NULLIF(s.deactivation_form_code, ''), 'IDF'),
    CASE
      WHEN COALESCE(s.deactivation_include_date, 1) = 1
        THEN DATE_FORMAT(f.created_at, '%m%Y')
      ELSE NULL
    END,
    LPAD(
      ROW_NUMBER() OVER (
        PARTITION BY f.company_id, YEAR(f.created_at)
        ORDER BY f.created_at, f.formID
      ),
      4,
      '0'
    )
  ) AS new_form_number
FROM intangible_deactivation_forms f
JOIN companies c
  ON c.companyID = f.company_id
LEFT JOIN accountability_form_settings s
  ON s.company_id = f.company_id AND s.deleted_at IS NULL
LEFT JOIN (
  SELECT
    company_id,
    MIN(code) AS code,
    MIN(prefix) AS prefix
  FROM asset_mngmnt_departments
  WHERE deleted_at IS NULL
    AND LOWER(TRIM(name)) IN ('hr', 'hr department', 'human resources', 'human resources department')
  GROUP BY company_id
) hr ON hr.company_id = f.company_id
WHERE f.deleted_at IS NULL
  AND f.company_id IS NOT NULL;

-- Preview the planned changes before applying them.
SELECT
  f.formID,
  f.form_number AS old_form_number,
  b.new_form_number,
  f.company_id,
  f.created_at
FROM intangible_deactivation_forms f
JOIN tmp_intangible_deactivation_form_backfill b ON b.formID = f.formID
ORDER BY f.company_id, f.created_at, f.formID;

-- Apply the backfill. The backup above allows restoration if required.
UPDATE intangible_deactivation_forms f
JOIN tmp_intangible_deactivation_form_backfill b ON b.formID = f.formID
SET f.form_number = b.new_form_number
WHERE f.formID <> ''
  AND f.deleted_at IS NULL;

DROP TEMPORARY TABLE IF EXISTS tmp_intangible_deactivation_form_backfill;
