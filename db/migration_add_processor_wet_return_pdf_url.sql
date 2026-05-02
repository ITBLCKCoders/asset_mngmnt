-- Migration: store processor-uploaded wet-signed asset return form PDF (local disk marker or legacy URL)
ALTER TABLE asset_return_forms
  ADD COLUMN processor_wet_return_pdf_url VARCHAR(1024) DEFAULT NULL;
