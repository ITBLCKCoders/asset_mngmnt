-- Migration to create custodians table
-- Version: dbv57
-- Date: 2026-01-18

CREATE TABLE IF NOT EXISTS custodians (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    asset_type ENUM('it', 'admin') NOT NULL,
    manager_role ENUM('none', 'itManager', 'adminManager', 'overallManager') NOT NULL DEFAULT 'none',
    access_levels JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(userID) ON DELETE CASCADE,
    UNIQUE KEY unique_user_asset_type (user_id, asset_type)
);

-- Create indexes for faster queries
CREATE INDEX idx_custodians_user_id ON custodians(user_id);
CREATE INDEX idx_custodians_asset_type ON custodians(asset_type);
CREATE INDEX idx_custodians_manager_role ON custodians(manager_role);

-- Add comments to the table and columns
ALTER TABLE custodians COMMENT = 'Table to track custodians and their asset management permissions';
ALTER TABLE custodians MODIFY COLUMN user_id VARCHAR(36) NOT NULL COMMENT 'Foreign key to users table (userID)';
ALTER TABLE custodians MODIFY COLUMN asset_type ENUM('it', 'admin') NOT NULL COMMENT 'Type of asset the custodian manages: IT or Admin';
ALTER TABLE custodians MODIFY COLUMN manager_role ENUM('none', 'itManager', 'adminManager', 'overallManager') NOT NULL DEFAULT 'none' COMMENT 'Manager role: none, IT Asset Manager, Admin Asset Manager, or Overall Asset Manager';
ALTER TABLE custodians MODIFY COLUMN access_levels JSON NOT NULL COMMENT 'JSON object containing access levels: addEdit, assign, return, transfer, disposal';
