-- Migration to add missing category for assets
-- This fixes the issue where assets with category_id '70eb8854-f4df-11f0-9f53-18c04d003e97'
-- were not appearing in the asset list because the category was missing from the database

-- Add the missing category for Human Resource Department
INSERT INTO `asset_categories` (
  `categoryID`,
  `company_id`,
  `name`,
  `code`,
  `prefix`,
  `department_id`,
  `created_at`,
  `created_by`,
  `updated_at`,
  `updated_by`,
  `deleted_at`,
  `deleted_by`
) VALUES (
  '70eb8854-f4df-11f0-9f53-18c04d003e97',
  'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f',
  'Computer Equipment',
  'COM',
  '2002',
  '12507366-cfd8-11f0-9d93-18c04d003e97',
  NOW(),
  '65abe729-c369-447e-a864-a8e98b74b842',
  NOW(),
  '65abe729-c369-447e-a864-a8e98b74b842',
  NULL,
  NULL
);
