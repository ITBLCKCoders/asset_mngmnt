-- Migration: add received_copy_201_file_signed_at and signed_by
-- For date, time, and signer name on Received Copy for 201 File section.

ALTER TABLE accountability_forms
  ADD COLUMN received_copy_201_file_signed_at DATETIME DEFAULT NULL,
  ADD COLUMN received_copy_201_file_signed_by CHAR(36) DEFAULT NULL AFTER received_copy_201_file_signature;
