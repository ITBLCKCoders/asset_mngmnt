-- Script to change all assets status to Available
-- Run this script to reset all asset statuses to 'Available'

USE `asset_mngmnt`;

SET SQL_SAFE_UPDATES = 0;

UPDATE assets 
SET status = 'Available';

SET SQL_SAFE_UPDATES = 1;

-- Optional: Verify the update
SELECT status, COUNT(*) as count 
FROM assets 
GROUP BY status; 