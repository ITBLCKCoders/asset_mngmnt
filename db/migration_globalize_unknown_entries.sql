-- Migration: Globalize Unknown Entries
-- Makes parent FKs nullable so a single "Unknown" entry per company can exist
-- without being tied to a specific category/type.
-- Then deduplicates existing "Unknown" entries across suppliers, types, and brands.

SET SQL_SAFE_UPDATES = 0;

-- 1. Make category_id nullable in suppliers table
ALTER TABLE suppliers
  MODIFY COLUMN category_id CHAR(36) NULL;

-- 2. Make category_id nullable in asset_types table
ALTER TABLE asset_types
  MODIFY COLUMN category_id CHAR(36) NULL;

-- 3. Make type_id nullable in asset_brands table
ALTER TABLE asset_brands
  MODIFY COLUMN type_id CHAR(36) NULL;

-- 4. Update existing Unknown/Unkown entries to have NULL parent FK
UPDATE suppliers
SET category_id = NULL
WHERE LOWER(name) IN ('unknown', 'unkown')
  AND deleted_at IS NULL;

UPDATE asset_types
SET category_id = NULL
WHERE LOWER(name) IN ('unknown', 'unkown')
  AND deleted_at IS NULL;

UPDATE asset_brands
SET type_id = NULL
WHERE LOWER(name) IN ('unknown', 'unkown')
  AND deleted_at IS NULL;

-- 5. Deduplicate: keep only the oldest Unknown entry per company per table
--    (hard delete since no FKs reference these IDs — assets store name as plain text)

DELETE s1 FROM suppliers s1
INNER JOIN suppliers s2
  ON s1.company_id = s2.company_id
  AND LOWER(s1.name) IN ('unknown', 'unkown')
  AND LOWER(s2.name) IN ('unknown', 'unkown')
  AND s1.supplierID > s2.supplierID
  AND s1.deleted_at IS NULL
  AND s2.deleted_at IS NULL;

DELETE t1 FROM asset_types t1
INNER JOIN asset_types t2
  ON t1.company_id = t2.company_id
  AND LOWER(t1.name) IN ('unknown', 'unkown')
  AND LOWER(t2.name) IN ('unknown', 'unkown')
  AND t1.typeID > t2.typeID
  AND t1.deleted_at IS NULL
  AND t2.deleted_at IS NULL;

DELETE b1 FROM asset_brands b1
INNER JOIN asset_brands b2
  ON b1.company_id = b2.company_id
  AND LOWER(b1.name) IN ('unknown', 'unkown')
  AND LOWER(b2.name) IN ('unknown', 'unkown')
  AND b1.brandID > b2.brandID
  AND b1.deleted_at IS NULL
  AND b2.deleted_at IS NULL;

SET SQL_SAFE_UPDATES = 1;
