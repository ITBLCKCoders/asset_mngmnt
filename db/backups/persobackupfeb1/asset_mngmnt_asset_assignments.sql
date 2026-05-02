CREATE DATABASE  IF NOT EXISTS `asset_mngmnt` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `asset_mngmnt`;
-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: asset_mngmnt
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `asset_assignments`
--

DROP TABLE IF EXISTS `asset_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_assignments` (
  `assignmentID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `asset_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_room_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `expected_return_date` datetime DEFAULT NULL,
  `actual_return_date` datetime DEFAULT NULL,
  `assignment_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('Active','Inactive','Returned','Lost','Damaged') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Active',
  `assigned_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`assignmentID`),
  KEY `asset_id` (`asset_id`),
  KEY `user_id` (`user_id`),
  KEY `department_id` (`department_id`),
  KEY `location_id` (`location_id`),
  KEY `location_room_id` (`location_room_id`),
  KEY `assigned_by` (`assigned_by`),
  CONSTRAINT `asset_assignments_ibfk_1` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`assetID`) ON DELETE CASCADE,
  CONSTRAINT `asset_assignments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`userID`) ON DELETE CASCADE,
  CONSTRAINT `asset_assignments_ibfk_3` FOREIGN KEY (`department_id`) REFERENCES `asset_mngmnt_departments` (`departmentID`) ON DELETE SET NULL,
  CONSTRAINT `asset_assignments_ibfk_4` FOREIGN KEY (`location_id`) REFERENCES `asset_mngmnt_locations` (`locationID`) ON DELETE SET NULL,
  CONSTRAINT `asset_assignments_ibfk_5` FOREIGN KEY (`location_room_id`) REFERENCES `asset_mngmnt_location_rooms` (`roomID`) ON DELETE SET NULL,
  CONSTRAINT `asset_assignments_ibfk_6` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_assignments`
--

LOCK TABLES `asset_assignments` WRITE;
/*!40000 ALTER TABLE `asset_assignments` DISABLE KEYS */;
INSERT INTO `asset_assignments` VALUES ('12b899ca-701b-4cda-b6f6-782416eb7950','156d5295-f45d-11f0-906b-b42e99f23680','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-18 19:03:49',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-18 19:03:49','2026-01-18 19:03:49',NULL),('456e0eb0-bd53-4aca-9def-a0edfb131a97','9f4b0cc8-f4a7-11f0-906b-b42e99f23680','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-19 03:56:04',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-19 03:56:04','2026-01-19 03:56:04',NULL),('54d8ecdf-07e3-4637-ba25-60d9ab9a9833','7b56f76d-f4a8-11f0-906b-b42e99f23680','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-19 04:01:45',NULL,'2026-01-19 04:03:56','Assigned via asset issuance\nReturn notes: ds - Condition: Good\nReturn condition: Good\nReturn notes: ds - Condition: Good','Returned','65abe729-c369-447e-a864-a8e98b74b842','2026-01-19 04:01:45','2026-01-19 04:03:56',NULL),('56d57647-a355-4fbb-9c18-4f765c4337b8','f42c4b69-f45a-11f0-906b-b42e99f23680','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-18 18:46:45',NULL,'2026-01-19 03:15:46','Assigned via asset issuance\nReturn notes: dasd - Condition: Good\nReturn condition: Good\nReturn notes: dasd - Condition: Good','Returned','65abe729-c369-447e-a864-a8e98b74b842','2026-01-18 18:46:45','2026-01-19 03:15:46',NULL),('684f485f-837d-4015-b4a3-4c1825d3353a','0664d47f-f48b-11f0-906b-b42e99f23680','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-19 00:47:11',NULL,'2026-01-19 03:07:42','Assigned via asset issuance\nReturn notes: dsa - Condition: Good\nReturn condition: Good\nReturn notes: dsa - Condition: Good','Returned','3e2657eb-baad-4653-bd2a-f163b3be6955','2026-01-19 00:47:11','2026-01-19 03:07:42',NULL),('6ceffeeb-4d5a-445c-a189-1958c7d02af3','1af8aae5-f476-11f0-906b-b42e99f23680','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-19 03:14:19',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-19 03:14:19','2026-01-19 03:14:19',NULL),('9d0c9a70-b3bb-4902-84a2-aad504c76c7b','5800c44a-f468-11f0-906b-b42e99f23680','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-18 20:23:22',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-18 20:23:22','2026-01-18 20:23:22',NULL),('a8b24b58-441a-4e65-bb90-ccfab2caa963','2a19c464-f4a7-11f0-906b-b42e99f23680','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-19 03:52:31',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-19 03:52:31','2026-01-19 03:52:31',NULL),('abaf8f76-c5d9-474d-9d6c-80b71dfc9005','ae23cfeb-f44d-11f0-906b-b42e99f23680','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-18 17:11:46',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-18 17:11:46','2026-01-18 17:11:46',NULL),('b82bbb12-a4ea-4046-a9e8-29407776c46f','4bd9d095-f47c-11f0-906b-b42e99f23680','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-19 03:14:19',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-19 03:14:19','2026-01-19 03:14:19',NULL),('c32df293-2c10-4019-95a3-bd7f8d242e11','9d2ee681-f45e-11f0-906b-b42e99f23680','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-18 19:22:50',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-18 19:22:50','2026-01-18 19:22:50',NULL),('d1910d38-2285-408f-95b8-5d89f1c646e2','a38eb0d0-f44d-11f0-906b-b42e99f23680','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-18 17:11:46',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-18 17:11:46','2026-01-18 17:11:46',NULL),('d1f75fb9-34f1-4e53-8ba0-e0f9f29f8757','5aa1685e-f44e-11f0-906b-b42e99f23680','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-18 18:45:15',NULL,'2026-01-19 03:23:11','Assigned via asset issuance\nReturn notes: dsa - Condition: Good\nReturn condition: Good\nReturn notes: dsa - Condition: Good','Returned','65abe729-c369-447e-a864-a8e98b74b842','2026-01-18 18:45:15','2026-01-19 03:23:11',NULL),('d4b23907-119f-4b8d-8051-6294e4018a5f','3f90259b-f489-11f0-906b-b42e99f23680','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-19 00:47:11',NULL,'2026-01-19 03:15:00','Assigned via asset issuance\nReturn notes: dsa - Condition: Good\nReturn condition: Good\nReturn notes: dsa - Condition: Good','Returned','3e2657eb-baad-4653-bd2a-f163b3be6955','2026-01-19 00:47:11','2026-01-19 03:15:00',NULL),('e699973b-22b5-4dd9-9b53-c7c4c49aa19d','093c506c-f4a8-11f0-906b-b42e99f23680','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-19 03:59:01',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-19 03:59:01','2026-01-19 03:59:01',NULL),('f5aa998e-bfe0-49f0-921b-d7e4afe1ab7c','65879a08-f4a7-11f0-906b-b42e99f23680','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-19 03:53:59',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-19 03:53:59','2026-01-19 03:53:59',NULL),('f6046be6-7827-41f6-998b-d2131e640b51','0ad02228-f45d-11f0-906b-b42e99f23680','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-18 19:03:49',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-18 19:03:49','2026-01-18 19:03:49',NULL),('f818984f-17f9-4466-aac0-f3c1029d09f9','7b6ec0b5-f462-11f0-906b-b42e99f23680','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-18 19:40:39',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-18 19:40:39','2026-01-18 19:40:39',NULL);
/*!40000 ALTER TABLE `asset_assignments` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_after_asset_assignment_insert` AFTER INSERT ON `asset_assignments` FOR EACH ROW BEGIN
    DECLARE v_asset_name VARCHAR(255);
    DECLARE v_asset_code VARCHAR(255);
    DECLARE v_assigned_by_name VARCHAR(255);
    DECLARE v_message TEXT;
    
    -- Get asset details
    SELECT a.name, a.asset_code INTO v_asset_name, v_asset_code
    FROM assets a
    WHERE a.assetID = NEW.asset_id;
    
    -- Get assigned by user name
    SELECT CONCAT(u.first_name, ' ', u.last_name) INTO v_assigned_by_name
    FROM users u
    WHERE u.userID = NEW.assigned_by;
    
    -- Create notification message
    SET v_message = CONCAT('You have been assigned asset ', v_asset_code, ' by ', v_assigned_by_name);
    
    -- Insert notification
    INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        data
    ) VALUES (
        NEW.user_id,
        'New Asset Assignment',
        v_message,
        'asset_assignment',
        JSON_OBJECT(
            'assetId', NEW.asset_id,
            'assetCode', v_asset_code,
            'assetName', v_asset_name,
            'assignedAt', NEW.assigned_date,
            'assignedBy', JSON_OBJECT(
                'id', NEW.assigned_by,
                'name', v_assigned_by_name
            )
        )
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-01 17:10:54
