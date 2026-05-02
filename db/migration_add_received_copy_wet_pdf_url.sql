-- Migration: store HR-uploaded wet-signed PDF URL for Received Copy (201 file)
ALTER TABLE accountability_forms
  ADD COLUMN received_copy_wet_pdf_url VARCHAR(1024) DEFAULT NULL
  AFTER received_copy_201_file_signed_by_name;
