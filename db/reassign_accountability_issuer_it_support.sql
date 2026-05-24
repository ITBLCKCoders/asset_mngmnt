-- Reassign accountability form issuer (Issued by / IT copy) to IT Support (Michael Castro).
-- Only forms whose assignee (issued-to) is in Black Coders Group Inc.
-- Schema: dblive3v10-11-5-24-26
--
-- Updates: created_by, issuer_signature, it_copy_signature
--
-- Prerequisite: users.digital_signature must be set for the target issuer user.
-- Back up accountability_forms before running.

USE asset_mngmnt;

SET @target_user_id = '476e06e6-2f5f-46d0-8292-5fde561a37b4';
SET @issued_to_company_id = '21a225aa-cdbc-11f0-acd5-047c16a24f9f';

SELECT companyID, name, email FROM companies
WHERE companyID = @issued_to_company_id AND deleted_at IS NULL;

SELECT userID, email, first_name, last_name,
       CASE WHEN digital_signature IS NULL OR TRIM(digital_signature) = ''
            THEN 'MISSING' ELSE 'OK' END AS digital_signature_status
FROM users
WHERE userID = @target_user_id;

SET @signature = (
  SELECT digital_signature FROM users WHERE userID = @target_user_id LIMIT 1
);

-- Preview: BCGI assignees only
SELECT COUNT(*) AS forms_to_update
FROM accountability_forms af
WHERE af.deleted_at IS NULL
  AND af.user_id IN (
    SELECT userID FROM users WHERE company_id = @issued_to_company_id
  );

SELECT af.formID, af.form_number, af.status, af.user_id, af.created_by
FROM accountability_forms af
WHERE af.deleted_at IS NULL
  AND af.user_id IN (
    SELECT userID FROM users WHERE company_id = @issued_to_company_id
  )
ORDER BY af.created_at DESC
LIMIT 20;

-- Apply (uncomment after reviewing preview)
/*
UPDATE accountability_forms af
SET af.created_by = @target_user_id,
    af.issuer_signature = @signature,
    af.it_copy_signature = @signature,
    af.updated_at = NOW()
WHERE af.deleted_at IS NULL
  AND af.user_id IN (
    SELECT userID FROM users WHERE company_id = @issued_to_company_id
  );
*/
