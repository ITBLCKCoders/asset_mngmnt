-- Wet-signed transfer form PDF (processor upload), same pattern as asset_return_forms.processor_wet_return_pdf_url
ALTER TABLE asset_transfer_forms
  ADD COLUMN processor_wet_transfer_pdf_url VARCHAR(1024) DEFAULT NULL;
