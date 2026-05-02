-- Migration: add return_batch_id to asset_returns for grouping multi-asset returns into one form
-- Run this on your asset_mngmnt database.

ALTER TABLE asset_returns
  ADD COLUMN return_batch_id VARCHAR(36) NULL DEFAULT NULL AFTER return_department_id,
  ADD INDEX idx_asset_returns_return_batch_id (return_batch_id);
