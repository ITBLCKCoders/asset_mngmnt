-- Remove default value from condition column to prevent automatic 'Good' assignment
ALTER TABLE assets MODIFY COLUMN `condition` ENUM('Excellent','Good','Fair','Poor','Damaged') DEFAULT NULL;

-- Remove default value from maintenance_schedule column to prevent automatic 'None' assignment
ALTER TABLE assets MODIFY COLUMN `maintenance_schedule` ENUM('Monthly','Quarterly','Semi-Annual','Annually','As Needed','None') DEFAULT NULL;
