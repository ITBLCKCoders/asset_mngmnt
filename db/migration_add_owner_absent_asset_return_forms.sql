-- Migration: owner absent — return form skips returner digital sign; dept head pending uses owner_absent OR signed_at
-- Run on asset_mngmnt after prior asset_return_forms migrations.

ALTER TABLE asset_return_forms
  ADD COLUMN owner_absent TINYINT(1) NOT NULL DEFAULT 0 AFTER process_user_position;
