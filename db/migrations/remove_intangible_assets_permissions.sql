-- Remove Intangible Assets permissions from role_permissions table
-- This script removes the Intangible Assets module permissions from all roles

-- Delete all Intangible Assets permissions
DELETE FROM `role_permissions` 
WHERE `module_name` = 'Intangible Assets';
