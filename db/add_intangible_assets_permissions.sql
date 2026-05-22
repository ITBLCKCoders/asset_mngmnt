-- Add Intangible Assets permissions to role_permissions table
-- This script adds the Intangible Assets module permissions for the admin role

-- Get the Admin role ID first
SET @admin_role_id = (SELECT roleID FROM `asset_mngmnt_roles` WHERE `name` = 'Admin' LIMIT 1);

-- Insert view permission
INSERT INTO `role_permissions` (`permission_id`, `role_id`, `module_name`, `permission_type`, `granted`, `created_at`, `updated_at`)
SELECT UUID(), @admin_role_id, 'Intangible Assets', 'view', 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM `role_permissions` 
  WHERE role_id = @admin_role_id AND module_name = 'Intangible Assets' AND permission_type = 'view'
);

-- Insert create permission
INSERT INTO `role_permissions` (`permission_id`, `role_id`, `module_name`, `permission_type`, `granted`, `created_at`, `updated_at`)
SELECT UUID(), @admin_role_id, 'Intangible Assets', 'create', 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM `role_permissions` 
  WHERE role_id = @admin_role_id AND module_name = 'Intangible Assets' AND permission_type = 'create'
);

-- Insert edit permission
INSERT INTO `role_permissions` (`permission_id`, `role_id`, `module_name`, `permission_type`, `granted`, `created_at`, `updated_at`)
SELECT UUID(), @admin_role_id, 'Intangible Assets', 'edit', 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM `role_permissions` 
  WHERE role_id = @admin_role_id AND module_name = 'Intangible Assets' AND permission_type = 'edit'
);
