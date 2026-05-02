-- One-time data cleanup: form workflows use printed name + timestamp (no stored
-- signature images on forms). Profile canvas signatures (users.digital_signature)
-- are NOT cleared by this script.
-- Safe to re-run: sets listed columns to NULL.
--
-- MySQL Workbench "safe updates" (sql_safe_updates): UPDATE must reference a KEY
-- column in WHERE. Using PRIMARY KEY (formID / borrow_request_id) avoids Error 1175.

UPDATE asset_return_forms SET
  signed_digital_signature = NULL,
  process_digital_signature = NULL,
  dept_head_digital_signature = NULL,
  it_manager_digital_signature = NULL
WHERE deleted_at IS NULL
  AND formID <> '';

UPDATE asset_transfer_forms SET
  signed_digital_signature = NULL,
  process_digital_signature = NULL,
  dept_head_digital_signature = NULL,
  it_manager_digital_signature = NULL,
  processor_pending_signature = NULL
WHERE deleted_at IS NULL
  AND formID <> '';

UPDATE accountability_forms SET
  issuer_signature = NULL,
  it_copy_signature = NULL,
  received_copy_201_file_signature = NULL
WHERE deleted_at IS NULL
  AND formID <> '';

UPDATE accountability_forms SET
  acknowledgments = JSON_REMOVE(CAST(acknowledgments AS JSON), '$.digitalSignature')
WHERE deleted_at IS NULL
  AND formID <> ''
  AND acknowledgments IS NOT NULL
  AND JSON_VALID(acknowledgments)
  AND JSON_CONTAINS_PATH(acknowledgments, 'one', '$.digitalSignature');

UPDATE asset_borrow_requests
SET dept_head_digital_signature = NULL
WHERE borrow_request_id <> '';
