-- Add missing columns to audit_logs table (prev_hash and row_hash already added)
ALTER TABLE audit_logs
ADD COLUMN status VARCHAR(20) NULL DEFAULT 'success',
ADD COLUMN severity VARCHAR(20) NULL DEFAULT 'info',
ADD COLUMN request_id VARCHAR(255) NULL,
ADD COLUMN session_id VARCHAR(255) NULL,
ADD COLUMN http_method VARCHAR(10) NULL,
ADD COLUMN http_endpoint VARCHAR(255) NULL;
