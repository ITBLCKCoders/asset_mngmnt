-- E2E Test Seed Data
-- Uses fixed UUIDs for referential integrity

-- 1. Company
INSERT INTO `companies` (`companyID`, `name`, `email`, `code`, `prefix`, `is_active`, `is_main`)
VALUES ('10000000-0000-0000-0000-000000000001', 'E2E Test Corp', 'e2e@test.com', 'E2E', 'E2E', 1, 1);

-- 2. Roles
INSERT INTO `asset_mngmnt_roles` (`roleID`, `name`, `description`, `asset_type`, `manager_role`, `access_add_edit`, `access_assignment`, `access_return`)
VALUES
('30000000-0000-0000-0000-000000000001', 'Super Admin', 'E2E Super Admin', 'it', 'overallManager', 1, 1, 1),
('30000000-0000-0000-0000-000000000002', 'Manager', 'E2E Manager', 'it', 'itManager', 0, 1, 1),
('30000000-0000-0000-0000-000000000003', 'User', 'E2E Regular User', 'it', 'none', 0, 0, 0);

-- 3. Role permissions (admin gets all, manager gets some, user gets view-only on Dashboard)
INSERT INTO `role_permissions` (`role_id`, `module_name`, `permission_type`, `granted`)
VALUES
-- Super Admin: all modules, all permissions
('30000000-0000-0000-0000-000000000001', 'Dashboard', 'view', 1),
('30000000-0000-0000-0000-000000000001', 'Dashboard', 'create', 1),
('30000000-0000-0000-0000-000000000001', 'Dashboard', 'edit', 1),
('30000000-0000-0000-0000-000000000001', 'Dashboard', 'delete', 1),
('30000000-0000-0000-0000-000000000001', 'Users', 'view', 1),
('30000000-0000-0000-0000-000000000001', 'Users', 'create', 1),
('30000000-0000-0000-0000-000000000001', 'Users', 'edit', 1),
('30000000-0000-0000-0000-000000000001', 'Users', 'delete', 1),
('30000000-0000-0000-0000-000000000001', 'Asset List', 'view', 1),
('30000000-0000-0000-0000-000000000001', 'Asset List', 'create', 1),
('30000000-0000-0000-0000-000000000001', 'Asset List', 'edit', 1),
('30000000-0000-0000-0000-000000000001', 'Asset List', 'delete', 1),
('30000000-0000-0000-0000-000000000001', 'Reports', 'view', 1),
('30000000-0000-0000-0000-000000000001', 'Reports', 'create', 1),
('30000000-0000-0000-0000-000000000001', 'Settings', 'view', 1),
('30000000-0000-0000-0000-000000000001', 'Settings', 'edit', 1),
('30000000-0000-0000-0000-000000000001', 'My Assets', 'view', 1),
('30000000-0000-0000-0000-000000000001', 'Audit Trail', 'view', 1),
-- Manager: Dashboard, Asset List (view), Reports (view), My Assets
('30000000-0000-0000-0000-000000000002', 'Dashboard', 'view', 1),
('30000000-0000-0000-0000-000000000002', 'Asset List', 'view', 1),
('30000000-0000-0000-0000-000000000002', 'Reports', 'view', 1),
('30000000-0000-0000-0000-000000000002', 'My Assets', 'view', 1),
-- Regular User: Dashboard (view), My Assets (view)
('30000000-0000-0000-0000-000000000003', 'Dashboard', 'view', 1),
('30000000-0000-0000-0000-000000000003', 'My Assets', 'view', 1);

-- 4. Department
INSERT INTO `asset_mngmnt_departments` (`departmentID`, `company_id`, `name`, `code`, `prefix`)
VALUES ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'IT Department', 'IT', 'IT');

-- 5. Users (verified=1, is_active=1, mfa_enabled=0)
-- Passwords (bcrypt hash, cost 10):
--   E2eAdmin123!  -> $2b$10$t2VN23Rq8tXWNtYhJJU2I.WyxpJ4G2vx4J6z/7RQk2gceYEXZlxq6
--   E2eManager123! -> $2b$10$RmQItc1ZLQkpyU3cdX3dgOmBL0pjXWk.oPQcXw5aTXCUUdnttXbpm
--   E2eUser123!    -> $2b$10$g0xdih/XS4S5xAaf9XJZIOZhFdH.UqVEnrO/YjBb3iRlIdm.SHdrG
INSERT INTO `users` (`userID`, `email`, `password`, `name`, `verified`, `is_active`, `first_name`, `last_name`, `username`, `contact_number`, `company_id`, `department_id`, `role_id`, `position`, `employee_number`, `mfa_enabled`)
VALUES
('40000000-0000-0000-0000-000000000001', 'e2e-admin@test.com', '$2b$10$t2VN23Rq8tXWNtYhJJU2I.WyxpJ4G2vx4J6z/7RQk2gceYEXZlxq6', 'E2E Admin', 1, 1, 'E2E', 'Admin', 'e2e-admin', '+639000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'System Admin', 'E2E-001', 0),
('40000000-0000-0000-0000-000000000002', 'e2e-manager@test.com', '$2b$10$RmQItc1ZLQkpyU3cdX3dgOmBL0pjXWk.oPQcXw5aTXCUUdnttXbpm', 'E2E Manager', 1, 1, 'E2E', 'Manager', 'e2e-manager', '+639000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'IT Manager', 'E2E-002', 0),
('40000000-0000-0000-0000-000000000003', 'e2e-user@test.com', '$2b$10$g0xdih/XS4S5xAaf9XJZIOZhFdH.UqVEnrO/YjBb3iRlIdm.SHdrG', 'E2E User', 1, 1, 'E2E', 'User', 'e2e-user', '+639000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Staff', 'E2E-003', 0);

-- 6. Asset categories
INSERT INTO `asset_categories` (`categoryID`, `company_id`, `name`, `prefix`, `gl_code`, `department_id`)
VALUES ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'IT Equipment', 'IT', 'GL-IT-001', '20000000-0000-0000-0000-000000000001');

-- 7. Asset types
INSERT INTO `asset_types` (`typeID`, `company_id`, `name`, `category_id`, `prefix`)
VALUES ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Laptop', '50000000-0000-0000-0000-000000000001', 'LAP'),
('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Printer', '50000000-0000-0000-0000-000000000001', 'PRN'),
('60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Network Device', '50000000-0000-0000-0000-000000000001', 'NET');

-- 8. Brands
INSERT INTO `asset_brands` (`brandID`, `company_id`, `name`, `type_id`)
VALUES ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Dell', '60000000-0000-0000-0000-000000000001'),
('80000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'HP', '60000000-0000-0000-0000-000000000002'),
('80000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Cisco', '60000000-0000-0000-0000-000000000003');

-- 9. Suppliers
INSERT INTO `suppliers` (`supplierID`, `company_id`, `name`, `category_id`, `contact`, `email`)
VALUES ('90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'E2E Tech Supplies', '50000000-0000-0000-0000-000000000001', '09170000001', 'supplier@e2e-test.com');

-- 10. Locations
INSERT INTO `asset_mngmnt_locations` (`locationID`, `company_id`, `name`, `floor_unit`, `building`, `department_id`)
VALUES ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'E2E Main Office', '2nd Floor', 'E2E Building', '20000000-0000-0000-0000-000000000001');

-- 11. Location rooms
INSERT INTO `asset_mngmnt_location_rooms` (`roomID`, `locationID`, `room_name`)
VALUES ('70000000-0000-0000-0000-000000000011', '70000000-0000-0000-0000-000000000001', 'Server Room'),
('70000000-0000-0000-0000-000000000012', '70000000-0000-0000-0000-000000000001', 'IT Work Area');

-- 12. Assets (3 test assets with different statuses)
INSERT INTO `assets` (`assetID`, `asset_code`, `name`, `description`, `category_id`, `type_id`, `brand`, `model`, `serial`, `company_id`, `location_id`, `department_id`, `condition`, `status`, `created_by`)
VALUES
('a1000000-0000-0000-0000-000000000001', 'E2E-IT-001', 'Dell Latitude 5540 Laptop', 'E2E test laptop', '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'Dell', 'Latitude 5540', 'E2ESN001', '10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Good', 'In Use', '40000000-0000-0000-0000-000000000001'),
('a1000000-0000-0000-0000-000000000002', 'E2E-IT-002', 'HP LaserJet Pro Printer', 'E2E test printer', '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002', 'HP', 'LaserJet Pro', 'E2ESN002', '10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Excellent', 'Available', '40000000-0000-0000-0000-000000000001'),
('a1000000-0000-0000-0000-000000000003', 'E2E-IT-003', 'Cisco Meraki MX64 Firewall', 'E2E test network device', '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000003', 'Cisco', 'Meraki MX64', 'E2ESN003', '10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Fair', 'Under Maintenance', '40000000-0000-0000-0000-000000000001');
