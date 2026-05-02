-- Store condition, notes, and condition images from Asset Transfer Confirmation (create-held flow)
-- so they appear in Transfer History and can be prefilled when executing.

ALTER TABLE transfer_form_assignments
  ADD COLUMN transfer_condition VARCHAR(50) DEFAULT NULL,
  ADD COLUMN transfer_notes TEXT DEFAULT NULL,
  ADD COLUMN condition_images JSON DEFAULT NULL;
