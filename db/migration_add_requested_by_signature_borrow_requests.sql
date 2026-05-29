-- Add requested_by_signature column to asset_borrow_requests
-- Stores the digital signature (base64 data URL) of the requester at submission time

ALTER TABLE `asset_borrow_requests`
  ADD COLUMN `requested_by_signature` LONGTEXT NULL AFTER `pre_usage_condition_images`;
