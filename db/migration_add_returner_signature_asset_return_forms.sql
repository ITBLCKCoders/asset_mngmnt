-- Migration: add signed_digital_signature to asset_return_forms (returner's signature image for PDF)
-- Run this on your asset_mngmnt database.
-- Allows the returner's signature to show on the PDF when viewed by others (e.g. Approvals, Asset Return Forms page).

ALTER TABLE asset_return_forms
  ADD COLUMN signed_digital_signature LONGTEXT DEFAULT NULL AFTER signed_by;
