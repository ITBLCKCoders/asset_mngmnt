-- Migration: add return_type and received_by to asset_return_forms
-- For Return Type (Returned/Offboarding) and Received By (IT Staff, etc.) selections.

ALTER TABLE asset_return_forms
  ADD COLUMN return_type VARCHAR(50) DEFAULT NULL,
  ADD COLUMN received_by VARCHAR(50) DEFAULT NULL;
