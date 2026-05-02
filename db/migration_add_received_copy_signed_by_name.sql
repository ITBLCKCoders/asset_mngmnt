-- Store signer full name directly so it always displays in PDF.
ALTER TABLE accountability_forms
  ADD COLUMN received_copy_201_file_signed_by_name VARCHAR(255) DEFAULT NULL;
