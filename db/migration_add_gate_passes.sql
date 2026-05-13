-- Migration for gate_passes table
-- This table tracks assets temporarily taken out of the building/office

CREATE TABLE IF NOT EXISTS asset_mngmnt_gate_passes (
  gate_pass_id VARCHAR(36) PRIMARY KEY,
  assignment_id VARCHAR(36) NOT NULL,
  asset_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  purpose TEXT NOT NULL,
  expected_return_date DATETIME,
  destination_location_id VARCHAR(36),
  destination_department_id VARCHAR(36),
  `condition` VARCHAR(50) NOT NULL,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(36),
  processed_by VARCHAR(36),
  actual_return_date DATETIME,
  FOREIGN KEY (assignment_id) REFERENCES asset_assignments(assignmentID) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(assetID) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(userID) ON DELETE CASCADE,
  FOREIGN KEY (destination_location_id) REFERENCES asset_mngmnt_locations(locationID) ON DELETE SET NULL,
  FOREIGN KEY (destination_department_id) REFERENCES asset_mngmnt_departments(departmentID) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(userID) ON DELETE SET NULL,
  FOREIGN KEY (processed_by) REFERENCES users(userID) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create index for faster queries
CREATE INDEX idx_gate_passes_user_id ON asset_mngmnt_gate_passes(user_id);
CREATE INDEX idx_gate_passes_asset_id ON asset_mngmnt_gate_passes(asset_id);
CREATE INDEX idx_gate_passes_status ON asset_mngmnt_gate_passes(status);
CREATE INDEX idx_gate_passes_created_at ON asset_mngmnt_gate_passes(created_at);
