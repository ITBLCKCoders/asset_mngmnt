-- Migration to add issuer_signature column to accountability_forms table
-- This will separate the issuer signature from the acknowledgments JSON field
-- for better data organization and retrieval

-- Add new column for issuer signature
ALTER TABLE accountability_forms
ADD COLUMN issuer_signature MEDIUMTEXT DEFAULT NULL AFTER acknowledgments;

-- Update the acknowledgments column comment to clarify it's for user signature
ALTER TABLE accountability_forms
MODIFY COLUMN acknowledgments JSON DEFAULT NULL COMMENT 'Contains user signature and other acknowledgment data (NOT issuer signature)';

-- Create index for better performance on issuer signature queries
CREATE INDEX idx_accountability_forms_issuer_signature ON accountability_forms (issuer_signature(255));

-- Update existing forms that have issuer signature in acknowledgments
-- This will migrate any existing issuer signatures from acknowledgments to the new column
UPDATE accountability_forms
SET issuer_signature = JSON_UNQUOTE(JSON_EXTRACT(acknowledgments, '$.issuerSignature'))
WHERE acknowledgments IS NOT NULL 
AND JSON_EXTRACT(acknowledgments, '$.issuerSignature') IS NOT NULL;

-- Remove issuerSignature from acknowledgments to clean up the data
UPDATE accountability_forms
SET acknowledgments = JSON_REMOVE(acknowledgments, '$.issuerSignature')
WHERE acknowledgments IS NOT NULL 
AND JSON_EXTRACT(acknowledgments, '$.issuerSignature') IS NOT NULL;

-- Verify the migration
SELECT 
    COUNT(*) as total_forms,
    COUNT(issuer_signature) as forms_with_issuer_signature,
    COUNT(CASE WHEN acknowledgments IS NOT NULL AND JSON_EXTRACT(acknowledgments, '$.issuerSignature') IS NOT NULL THEN 1 END) as forms_with_issuer_in_acknowledgments
FROM accountability_forms;