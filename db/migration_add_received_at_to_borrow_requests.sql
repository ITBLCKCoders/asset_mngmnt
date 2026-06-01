-- Migration: Add received_at and received_by columns to asset_borrow_requests
-- This tracks when a borrow request is received/acknowledged by the receiving manager (Manager Approver 2)
-- The asset will only appear in the user's My Assets page after this receive step

-- Add received_at column (run this first)
ALTER TABLE asset_borrow_requests
ADD COLUMN received_at DATETIME NULL DEFAULT NULL AFTER approved_by;

-- Add received_by column (run this second)
ALTER TABLE asset_borrow_requests
ADD COLUMN received_by CHAR(36) NULL DEFAULT NULL AFTER received_at;

-- Add index for faster queries on pending receive approvals
CREATE INDEX idx_borrow_requests_received_at ON asset_borrow_requests(received_at);
