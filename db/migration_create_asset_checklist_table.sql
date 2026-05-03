-- Migration: create asset_checklists table
-- Run on asset_mngmnt database.

CREATE TABLE IF NOT EXISTS asset_checklists (
  id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  assignment_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  employee_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  employee_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  employee_designation VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  employee_department VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  employee_company VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  type_onboarding TINYINT(1) DEFAULT 0,
  type_offboarding TINYINT(1) DEFAULT 0,
  received_by VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  checklist_data JSON DEFAULT NULL,
  remarks TEXT DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  created_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_asset_checklists_assignment_id (assignment_id),
  KEY idx_asset_checklists_employee_id (employee_id),
  CONSTRAINT fk_asset_checklists_assignment_id FOREIGN KEY (assignment_id) REFERENCES asset_assignments (assignmentID) ON DELETE CASCADE,
  CONSTRAINT fk_asset_checklists_employee_id FOREIGN KEY (employee_id) REFERENCES users (userID) ON DELETE CASCADE,
  CONSTRAINT fk_asset_checklists_created_by FOREIGN KEY (created_by) REFERENCES users (userID) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
