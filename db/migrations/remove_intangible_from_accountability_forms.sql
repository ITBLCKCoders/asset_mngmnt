-- Remove intangible asset entries from accountability_forms.assets_data JSON
-- Preserves all tangible asset entries and all existing top-level keys
-- (such as form_origin, previous_form_id, assignment_ids, etc.)
--
-- If a form had ONLY intangible assets, its assets_data is set to NULL.

SET SQL_SAFE_UPDATES = 0;

DROP TEMPORARY TABLE IF EXISTS `tmp_filtered_forms`;

CREATE TEMPORARY TABLE `tmp_filtered_forms` AS
SELECT
  af.`formID`,
  af.`assets_data` AS original_data,
  (
    SELECT JSON_ARRAYAGG(
      JSON_OBJECT(
        'id', jt.`id`,
        'code', jt.`code`,
        'name', jt.`name`,
        'category', jt.`category`,
        'type', jt.`type`,
        'department', jt.`department`,
        'serialNo', jt.`serialNo`,
        'modelNo', jt.`modelNo`,
        'brand', jt.`brand`
      )
    )
    FROM JSON_TABLE(
      IFNULL(af.`assets_data`->>'$.assets', '[]'),
      '$[*]' COLUMNS(
        `id` VARCHAR(36) PATH '$.id',
        `code` VARCHAR(255) PATH '$.code',
        `name` VARCHAR(255) PATH '$.name',
        `category` VARCHAR(255) PATH '$.category',
        `type` VARCHAR(255) PATH '$.type',
        `department` VARCHAR(255) PATH '$.department',
        `serialNo` VARCHAR(255) PATH '$.serialNo',
        `modelNo` VARCHAR(255) PATH '$.modelNo',
        `brand` VARCHAR(255) PATH '$.brand'
      )
    ) jt
    WHERE jt.`category` != 'Intangible'
  ) AS filtered_assets
FROM `accountability_forms` af
WHERE af.`assets_data` IS NOT NULL
  AND JSON_SEARCH(af.`assets_data`, 'one', 'Intangible') IS NOT NULL;

UPDATE `accountability_forms` af
INNER JOIN `tmp_filtered_forms` tf ON af.`formID` = tf.`formID`
SET af.`assets_data` = CASE
  WHEN tf.`filtered_assets` IS NOT NULL AND JSON_LENGTH(tf.`filtered_assets`) > 0
  THEN JSON_SET(tf.`original_data`, '$.assets', tf.`filtered_assets`)
  ELSE NULL
END;

DROP TEMPORARY TABLE IF EXISTS `tmp_filtered_forms`;

SET SQL_SAFE_UPDATES = 1;