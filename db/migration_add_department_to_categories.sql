-- Migration to add department_id column to asset_categories table
-- This adds a foreign key relationship to the departments table

ALTER TABLE `asset_categories` 
ADD COLUMN `department_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER `gl_code`,
ADD KEY `idx_department_id` (`department_id`),
ADD CONSTRAINT `fk_asset_categories_department` FOREIGN KEY (`department_id`) REFERENCES `asset_mngmnt_departments` (`departmentID`) ON DELETE SET NULL;

-- Update existing categories to have a default department (optional)
-- You can run this if you want to assign a default department to existing categories
-- UPDATE `asset_categories` SET `department_id` = (SELECT `departmentID` FROM `asset_mngmnt_departments` WHERE `company_id` = `asset_categories`.`company_id` LIMIT 1) WHERE `department_id` IS NULL;