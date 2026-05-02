-- Compliance audit migration
-- Adds metadata fields, hash-chain fields, and archive table for audit logs.

-- Stored procedure to add column if it doesn't exist
DELIMITER //
DROP PROCEDURE IF EXISTS add_column_if_not_exists //
CREATE PROCEDURE add_column_if_not_exists()
BEGIN
  -- Add status column
  IF NOT EXISTS (
    SELECT * FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND column_name = 'status'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN status ENUM('success','failure') NOT NULL DEFAULT 'success' AFTER company_id;
  END IF;

  -- Add severity column
  IF NOT EXISTS (
    SELECT * FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND column_name = 'severity'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN severity ENUM('info','warning','critical') NOT NULL DEFAULT 'info' AFTER status;
  END IF;

  -- Add request_id column
  IF NOT EXISTS (
    SELECT * FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND column_name = 'request_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN request_id VARCHAR(64) NULL AFTER severity;
  END IF;

  -- Add session_id column
  IF NOT EXISTS (
    SELECT * FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN session_id VARCHAR(64) NULL AFTER request_id;
  END IF;

  -- Add http_method column
  IF NOT EXISTS (
    SELECT * FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND column_name = 'http_method'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN http_method VARCHAR(16) NULL AFTER session_id;
  END IF;

  -- Add http_endpoint column
  IF NOT EXISTS (
    SELECT * FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND column_name = 'http_endpoint'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN http_endpoint VARCHAR(255) NULL AFTER http_method;
  END IF;

  -- Add prev_hash column
  IF NOT EXISTS (
    SELECT * FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND column_name = 'prev_hash'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN prev_hash CHAR(64) NULL AFTER http_endpoint;
  END IF;

  -- Add row_hash column
  IF NOT EXISTS (
    SELECT * FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND column_name = 'row_hash'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN row_hash CHAR(64) NULL AFTER prev_hash;
  END IF;
END //
DELIMITER ;

CALL add_column_if_not_exists();
DROP PROCEDURE IF EXISTS add_column_if_not_exists;

-- Add indexes (IF NOT EXISTS is supported for indexes in MySQL 8.0+)
-- For older versions, we use a similar approach
DELIMITER //
DROP PROCEDURE IF EXISTS add_index_if_not_exists //
CREATE PROCEDURE add_index_if_not_exists()
BEGIN
  IF NOT EXISTS (
    SELECT * FROM information_schema.statistics
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND index_name = 'idx_audit_logs_status'
  ) THEN
    ALTER TABLE audit_logs ADD INDEX idx_audit_logs_status (status);
  END IF;

  IF NOT EXISTS (
    SELECT * FROM information_schema.statistics
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND index_name = 'idx_audit_logs_severity'
  ) THEN
    ALTER TABLE audit_logs ADD INDEX idx_audit_logs_severity (severity);
  END IF;

  IF NOT EXISTS (
    SELECT * FROM information_schema.statistics
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND index_name = 'idx_audit_logs_request_id'
  ) THEN
    ALTER TABLE audit_logs ADD INDEX idx_audit_logs_request_id (request_id);
  END IF;

  IF NOT EXISTS (
    SELECT * FROM information_schema.statistics
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND index_name = 'idx_audit_logs_session_id'
  ) THEN
    ALTER TABLE audit_logs ADD INDEX idx_audit_logs_session_id (session_id);
  END IF;

  IF NOT EXISTS (
    SELECT * FROM information_schema.statistics
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND index_name = 'idx_audit_logs_company_created'
  ) THEN
    ALTER TABLE audit_logs ADD INDEX idx_audit_logs_company_created (company_id, created_at);
  END IF;

  IF NOT EXISTS (
    SELECT * FROM information_schema.statistics
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND index_name = 'idx_audit_logs_resource_lookup'
  ) THEN
    ALTER TABLE audit_logs ADD INDEX idx_audit_logs_resource_lookup (resource_type, resource_id);
  END IF;

  IF NOT EXISTS (
    SELECT * FROM information_schema.statistics
    WHERE table_schema = DATABASE()
    AND table_name = 'audit_logs'
    AND index_name = 'idx_audit_logs_row_hash'
  ) THEN
    ALTER TABLE audit_logs ADD INDEX idx_audit_logs_row_hash (row_hash);
  END IF;
END //
DELIMITER ;

CALL add_index_if_not_exists();
DROP PROCEDURE IF EXISTS add_index_if_not_exists;

CREATE TABLE IF NOT EXISTS audit_logs_archive (
  archive_id CHAR(36) NOT NULL DEFAULT (UUID()),
  auditID CHAR(36) NOT NULL,
  user_id CHAR(36) DEFAULT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id CHAR(36) DEFAULT NULL,
  resource_name VARCHAR(255) DEFAULT NULL,
  details TEXT,
  old_values TEXT,
  new_values TEXT,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT,
  company_id CHAR(36) DEFAULT NULL,
  status ENUM('success','failure') NOT NULL DEFAULT 'success',
  severity ENUM('info','warning','critical') NOT NULL DEFAULT 'info',
  request_id VARCHAR(64) DEFAULT NULL,
  session_id VARCHAR(64) DEFAULT NULL,
  http_method VARCHAR(16) DEFAULT NULL,
  http_endpoint VARCHAR(255) DEFAULT NULL,
  prev_hash CHAR(64) DEFAULT NULL,
  row_hash CHAR(64) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  archived_by CHAR(36) DEFAULT NULL,
  PRIMARY KEY (archive_id),
  KEY idx_audit_logs_archive_audit_id (auditID),
  KEY idx_audit_logs_archive_company_created (company_id, created_at),
  KEY idx_audit_logs_archive_archived_at (archived_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit retention settings table
CREATE TABLE IF NOT EXISTS audit_retention_settings (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  company_id CHAR(36) NOT NULL,
  retention_months INT NOT NULL DEFAULT 36,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_archived_at DATETIME DEFAULT NULL,
  archived_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by CHAR(36) DEFAULT NULL,
  updated_by CHAR(36) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idx_audit_retention_company (company_id),
  CONSTRAINT fk_audit_retention_company FOREIGN KEY (company_id) REFERENCES companies (companyID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System-wide audit retention defaults in settings table
INSERT INTO asset_mngmnt_settings (`key`, `value`, `description`, `type`)
VALUES 
  ('audit_retention_default_months', '36', 'Default retention horizon in months for new companies', 'number'),
  ('audit_retention_minimum_months', '12', 'Minimum retention horizon in months (system-wide floor)', 'number')
ON DUPLICATE KEY UPDATE description = VALUES(description), `value` = VALUES(`value`);
