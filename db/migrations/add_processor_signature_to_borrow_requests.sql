-- Add processor signature fields to asset_borrow_requests table
-- This allows capturing the processor's digital signature and timestamp when processing borrow requests

ALTER TABLE asset_mngmnt_asset_borrow_requests
ADD COLUMN processor_signature TEXT NULL COMMENT 'Digital signature of the processor who approved the borrow request',
ADD COLUMN processor_signed_at DATETIME NULL COMMENT 'Timestamp when the processor signed the borrow request';
