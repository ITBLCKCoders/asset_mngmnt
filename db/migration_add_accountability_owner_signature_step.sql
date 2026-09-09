-- Add the accountability owner signature step to the approval flow.
--
-- New standard-flow order:
--   1. pending_admin_copy_signature -> IT/Admin copy signer
--   2. pending_owner_signature       -> accountability owner signs
--   3. pending_approval              -> owner's designated approver/sub-approver
--   4. approved
--
-- The ENUM is rebuilt because MySQL cannot insert a value into the middle of
-- an existing ENUM in place. The backfill moves in-flight standard forms
-- (copy signed, approver not yet signed, owner not yet signed) to the new
-- owner-signature step so the owner signs before the approver.

ALTER TABLE accountability_forms
  MODIFY COLUMN approval_status ENUM(
    'pending_admin_copy_signature',
    'pending_owner_signature',
    'pending_approval',
    'pending_it',
    'pending_admin',
    'pending_hr',
    'approved'
  ) NULL DEFAULT NULL;

-- Backfill only standard accountability forms that are mid-flow:
-- the IT/Admin copy was signed (they have a designated copy signer) and the
-- owner has not signed yet (status = 'Pending'). Clearance forms
-- (no admin_copy_signer_id) and already-owner-signed forms are untouched.
UPDATE accountability_forms
   SET approval_status = 'pending_owner_signature'
 WHERE approval_status = 'pending_approval'
   AND admin_copy_signer_id IS NOT NULL
   AND status = 'Pending';
