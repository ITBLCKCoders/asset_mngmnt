-- Split Forms "Transfer forms" permission from Assets "Asset Transfer".
-- Run on asset_mngmnt after deploying code that adds module "Transfer Form".
-- Copies existing Asset Transfer grants so behavior matches the previous single module.

INSERT INTO user_permissions (user_id, module_name, permission_type, granted)
SELECT up.user_id, 'Transfer Form', up.permission_type, up.granted
FROM user_permissions up
WHERE up.module_name = 'Asset Transfer'
  AND NOT EXISTS (
    SELECT 1
    FROM user_permissions existing
    WHERE existing.user_id = up.user_id
      AND existing.module_name = 'Transfer Form'
      AND existing.permission_type = up.permission_type
  );

INSERT INTO role_permissions (role_id, module_name, permission_type, granted)
SELECT rp.role_id, 'Transfer Form', rp.permission_type, rp.granted
FROM role_permissions rp
WHERE rp.module_name = 'Asset Transfer'
  AND NOT EXISTS (
    SELECT 1
    FROM role_permissions existing
    WHERE existing.role_id = rp.role_id
      AND existing.module_name = 'Transfer Form'
      AND existing.permission_type = rp.permission_type
  );
