-- Asset borrow requests (IT/Admin scoped category+type, return date, purpose).
-- After deploy: grant "Asset Borrowing" (view/create) to roles that may submit requests,
-- and "Borrow Request Management" (view) to IT/Admin manager roles via Users → Permissions.

CREATE TABLE IF NOT EXISTS `asset_borrow_requests` (
  `borrow_request_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `company_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `borrow_scope` enum('it','admin') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expected_return_at` datetime NOT NULL,
  `purpose` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending_dept_head',
  `dept_head_signed_at` datetime DEFAULT NULL,
  `dept_head_signed_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dept_head_digital_signature` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `declined_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`borrow_request_id`),
  KEY `idx_abr_company_status` (`company_id`,`status`),
  KEY `idx_abr_borrow_scope` (`borrow_scope`),
  KEY `idx_abr_dept_pending` (`company_id`, `dept_head_signed_at`, `declined_at`),
  CONSTRAINT `fk_abr_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`companyID`) ON DELETE CASCADE,
  CONSTRAINT `fk_abr_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`userID`) ON DELETE CASCADE,
  CONSTRAINT `fk_abr_category` FOREIGN KEY (`category_id`) REFERENCES `asset_categories` (`categoryID`),
  CONSTRAINT `fk_abr_type` FOREIGN KEY (`type_id`) REFERENCES `asset_types` (`typeID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
