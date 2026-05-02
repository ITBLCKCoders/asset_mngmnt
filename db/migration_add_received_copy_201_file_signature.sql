-- Migration: add received_copy_201_file_signature to accountability_forms
-- For "Received Copy for 201 File" signature on the 3rd page (HR Copy).
-- Run this on your asset_mngmnt database.

ALTER TABLE accountability_forms
  ADD COLUMN received_copy_201_file_signature MEDIUMTEXT DEFAULT NULL AFTER it_copy_signature;
