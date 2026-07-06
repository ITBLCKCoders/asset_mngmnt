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
--   E2eAdmin123!  -> $2b$10$STVgJvgoD0H0ck6hpI78JuJX9SdQGkrbYSwF5cWTQRf9yF1rVNWxC
--   E2eManager123! -> $2b$10$T5LvCxbTNwge2v8hpCxhFeJNEinf8t6XPLYrYBqawWW.V98ohwe9y
--   E2eUser123!    -> $2b$10$fuGY5h1gAo4Kz/rNq.ujs.qnFHa1jIh7LJG.48HUC6Yw2ajPXOcgK
INSERT INTO `users` (`userID`, `email`, `password`, `name`, `verified`, `is_active`, `first_name`, `last_name`, `username`, `contact_number`, `company_id`, `department_id`, `role_id`, `position`, `employee_number`)
VALUES
('40000000-0000-0000-0000-000000000001', 'e2e-admin@test.com', '$2b$10$STVgJvgoD0H0ck6hpI78JuJX9SdQGkrbYSwF5cWTQRf9yF1rVNWxC', 'E2E Admin', 1, 1, 'E2E', 'Admin', 'e2e-admin', '+639000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'System Admin', 'E2E-001'),
('40000000-0000-0000-0000-000000000002', 'e2e-manager@test.com', '$2b$10$T5LvCxbTNwge2v8hpCxhFeJNEinf8t6XPLYrYBqawWW.V98ohwe9y', 'E2E Manager', 1, 1, 'E2E', 'Manager', 'e2e-manager', '+639000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'IT Manager', 'E2E-002'),
('40000000-0000-0000-0000-000000000003', 'e2e-user@test.com', '$2b$10$fuGY5h1gAo4Kz/rNq.ujs.qnFHa1jIh7LJG.48HUC6Yw2ajPXOcgK', 'E2E User', 1, 1, 'E2E', 'User', 'e2e-user', '+639000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'Staff', 'E2E-003')
ON DUPLICATE KEY UPDATE
  `password` = VALUES(`password`),
  `name` = VALUES(`name`),
  `verified` = VALUES(`verified`),
  `is_active` = VALUES(`is_active`),
  `first_name` = VALUES(`first_name`),
  `last_name` = VALUES(`last_name`),
  `username` = VALUES(`username`);

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

-- 12. Assets (5 test assets with different statuses)
INSERT INTO `assets` (`assetID`, `asset_code`, `name`, `description`, `category_id`, `type_id`, `brand`, `model`, `serial`, `company_id`, `location_id`, `department_id`, `condition`, `status`, `created_by`)
VALUES
('a1000000-0000-0000-0000-000000000001', 'E2E-IT-001', 'Dell Latitude 5540 Laptop', 'E2E test laptop', '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'Dell', 'Latitude 5540', 'E2ESN001', '10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Good', 'In Use', '40000000-0000-0000-0000-000000000001'),
('a1000000-0000-0000-0000-000000000002', 'E2E-IT-002', 'HP LaserJet Pro Printer', 'E2E test printer', '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002', 'HP', 'LaserJet Pro', 'E2ESN002', '10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Excellent', 'Available', '40000000-0000-0000-0000-000000000001'),
('a1000000-0000-0000-0000-000000000003', 'E2E-IT-003', 'Cisco Meraki MX64 Firewall', 'E2E test network device', '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000003', 'Cisco', 'Meraki MX64', 'E2ESN003', '10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Fair', 'Under Maintenance', '40000000-0000-0000-0000-000000000001'),
('a1000000-0000-0000-0000-000000000004', 'E2E-IT-004', 'Dell Latitude 5550 Laptop', 'E2E test laptop for assignment', '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'Dell', 'Latitude 5550', 'E2ESN004', '10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Good', 'Available', '40000000-0000-0000-0000-000000000001'),
('a1000000-0000-0000-0000-000000000005', 'E2E-IT-005', 'HP ProBook 450 Laptop', 'E2E test laptop for borrowing', '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'HP', 'ProBook 450', 'E2ESN005', '10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Good', 'Available', '40000000-0000-0000-0000-000000000001');

-- 13. Asset assignments (active assignment for E2E User)
INSERT INTO `asset_assignments` (`assignmentID`, `asset_id`, `user_id`, `department_id`, `location_id`, `location_room_id`, `assigned_date`, `status`, `assigned_by`)
VALUES
('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000012', NOW(), 'Active', '40000000-0000-0000-0000-000000000001');

-- 14. Asset builders
INSERT INTO `asset_builders` (`builderID`, `company_id`, `name`, `description`, `type_id`, `category_id`, `created_by`)
VALUES
('c1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'E2E Test Builder', 'E2E test asset builder for computer-type', '60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001');

-- 15. Settings entries (form settings, MFA settings, security settings)
INSERT INTO `accountability_form_settings` (`id`, `company_id`, `company_format`, `department_format`, `it_accountability_form_code`, `admin_accountability_form_code`, `include_date`, `date_format`, `created_by`)
VALUES ('l1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'code', 'code', '1021', '6012', 1, 'MMYYYY', '40000000-0000-0000-0000-000000000001')
ON DUPLICATE KEY UPDATE `company_id` = `company_id`;

INSERT INTO `asset_return_form_settings` (`id`, `company_id`, `company_format`, `department_format`, `it_asset_return_code`, `admin_asset_return_code`, `include_date`, `date_format`, `created_by`)
VALUES ('l1000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'code', 'code', '1009', '1009', 1, 'MMYYYY', '40000000-0000-0000-0000-000000000001')
ON DUPLICATE KEY UPDATE `company_id` = `company_id`;

INSERT INTO `asset_transfer_form_settings` (`id`, `company_id`, `company_format`, `department_format`, `it_asset_transfer_code`, `admin_asset_transfer_code`, `include_date`, `date_format`, `created_by`)
VALUES ('l1000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'code', 'code', 'TRF', 'TRF', 1, 'MMYYYY', '40000000-0000-0000-0000-000000000001')
ON DUPLICATE KEY UPDATE `company_id` = `company_id`;

-- 16. Asset borrow requests (pending dept head approval)
INSERT INTO `asset_borrow_requests` (`borrow_request_id`, `company_id`, `user_id`, `borrow_scope`, `category_id`, `type_id`, `expected_return_at`, `purpose`, `status`)
VALUES
('d1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'it', '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', DATE_ADD(NOW(), INTERVAL 7 DAY), 'E2E test borrow request for laptop', 'pending_dept_head');

-- 17. Asset return forms (pending dept head approval, signed by user)
INSERT INTO `asset_return_forms` (`formID`, `form_number`, `user_id`, `department_id`, `location_id`, `location_room_id`, `created_by`, `signed_at`, `signed_by`)
VALUES
('e1000000-0000-0000-0000-000000000001', 'E2E-RF-001', '40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000003', NOW(), '40000000-0000-0000-0000-000000000003');

-- 18. Asset returns linked to return form (uses the active assignment)
INSERT INTO `asset_returns` (`return_id`, `assignment_id`, `user_id`, `return_condition`, `return_notes`, `pdf_file_path`, `form_id`)
VALUES
('e1000000-0000-0000-0000-000000000011', 'b1000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'Good', 'E2E test return', 'e2e-test-return.pdf', 'e1000000-0000-0000-0000-000000000001');

-- 19. Asset transfer forms (signed, pending dept head approval)
INSERT INTO `asset_transfer_forms` (`formID`, `form_number`, `user_id`, `department_id`, `location_id`, `location_room_id`, `new_assigned_user_id`, `created_by`, `signed_at`, `signed_by`, `transfer_type`)
VALUES
('f1000000-0000-0000-0000-000000000001', 'E2E-TRF-001', '40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003', NOW(), '40000000-0000-0000-0000-000000000003', 'standard');

-- 20. Transfer form assignments
INSERT INTO `transfer_form_assignments` (`form_id`, `assignment_id`)
VALUES ('f1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001');

-- 21. Accountability forms (Pending status, user has unsigned form)
INSERT INTO `accountability_forms` (`formID`, `form_number`, `assignment_id`, `asset_id`, `user_id`, `department_id`, `location_id`, `location_room_id`, `status`, `created_by`, `created_at`)
VALUES
('g1000000-0000-0000-0000-000000000001', 'E2E-ACF-001', 'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000012', 'Pending', '40000000-0000-0000-0000-000000000001', NOW());

-- 22. Notifications (unread for E2E User)
INSERT INTO `notifications` (`notificationID`, `user_id`, `title`, `message`, `type`, `status`, `data`)
VALUES
('h1000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'Asset Assigned', 'You have been assigned Dell Latitude 5540 Laptop', 'asset_assignment', 'unread', JSON_OBJECT('assignmentId', 'b1000000-0000-0000-0000-000000000001', 'assetName', 'Dell Latitude 5540 Laptop'));

-- 23. Audit logs
INSERT INTO `audit_logs` (`auditID`, `user_id`, `action`, `resource_type`, `resource_id`, `resource_name`, `details`, `company_id`, `status`)
VALUES
('i1000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'CREATE_ASSET', 'asset', 'a1000000-0000-0000-0000-000000000001', 'Dell Latitude 5540 Laptop', 'Asset created via E2E seed', '10000000-0000-0000-0000-000000000001', 'success');

-- 24. Gate passes
INSERT INTO `asset_mngmnt_gate_passes` (`gate_pass_id`, `assignment_id`, `asset_id`, `user_id`, `purpose`, `expected_return_date`, `destination_location_id`, `condition`, `status`, `created_by`)
VALUES
('j1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'E2E test off-site work', DATE_ADD(NOW(), INTERVAL 1 DAY), '70000000-0000-0000-0000-000000000001', 'Good', 'Approved', '40000000-0000-0000-0000-000000000001');

-- 25. Intangible assets
INSERT INTO `intangible_assets` (`id`, `company_id`, `name`, `description`, `type`, `status`, `created_by`)
VALUES
('k1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'E2E Software License', 'E2E test software license', 'IT scope', 'available', '40000000-0000-0000-0000-000000000001');
