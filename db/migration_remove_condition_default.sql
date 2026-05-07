-- Remove default value from condition column to prevent automatic 'Good' assignment
-- Keep the full ENUM values to support all UI options (New, Bad, Needs Repair, Obsolete)
ALTER TABLE assets MODIFY COLUMN `condition` ENUM('New','Excellent','Good','Fair','Poor','Bad','Needs Repair','Obsolete','Damaged') DEFAULT NULL;

-- Remove default value from maintenance_schedule column to prevent automatic 'None' assignment
ALTER TABLE assets MODIFY COLUMN `maintenance_schedule` ENUM('Monthly','Quarterly','Semi-Annual','Annually','As Needed','None') DEFAULT NULL;
