-- Optional: drop custodians table after role-based custodian is verified in production.
-- Custodian filtering now uses asset_mngmnt_roles (asset_type, manager_role, access_*).
-- Run only when you no longer need the old custodians data.

-- DROP TABLE IF EXISTS custodians;
