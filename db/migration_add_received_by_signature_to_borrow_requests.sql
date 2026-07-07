-- Migration: Add received_by_signature column to asset_borrow_requests
-- This stores the digital signature of the Manager Approver 2 who received the borrow request

ALTER TABLE asset_borrow_requests
ADD COLUMN received_by_signature TEXT NULL DEFAULT NULL AFTER received_by;
