-- Store processor digital signature at create-held (Asset Transfer Confirmation).
-- Used for auto-execute when both dept heads approve; not displayed until then.

ALTER TABLE asset_transfer_forms
  ADD COLUMN processor_pending_signature LONGTEXT DEFAULT NULL,
  ADD COLUMN processor_pending_signed_at DATETIME DEFAULT NULL;
