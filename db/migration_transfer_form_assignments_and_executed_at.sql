-- Migration: transfer_form_assignments table and executed_at on asset_transfer_forms
-- For transfer-request flow: store which assignments belong to a form before execution;
-- executed_at marks forms that have been executed so they leave the "approved for execution" list.
-- Run after migration_create_asset_transfer_forms.sql and migration_add_transfer_form_approvals.sql

-- 1. Add executed_at to asset_transfer_forms (nullable; set when transfer is executed)
ALTER TABLE asset_transfer_forms ADD COLUMN executed_at DATETIME DEFAULT NULL;

-- 2. Create transfer_form_assignments (form_id, assignment_id) for submit-request flow
CREATE TABLE IF NOT EXISTS transfer_form_assignments (
  form_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  assignment_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (form_id, assignment_id),
  KEY idx_tfa_form_id (form_id),
  KEY idx_tfa_assignment_id (assignment_id),
  CONSTRAINT fk_tfa_form_id FOREIGN KEY (form_id) REFERENCES asset_transfer_forms (formID) ON DELETE CASCADE,
  CONSTRAINT fk_tfa_assignment_id FOREIGN KEY (assignment_id) REFERENCES asset_assignments (assignmentID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
