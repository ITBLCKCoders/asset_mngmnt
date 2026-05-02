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
-- Table structure for table `asset_returns`
--

DROP TABLE IF EXISTS `asset_returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_returns` (
  `return_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `assignment_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `return_condition` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `return_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `return_location_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Location where asset was returned to',
  `return_location_room_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Room/area where asset was returned to',
  `return_department_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Department where asset was returned to',
  `return_batch_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `form_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `condition_images` json DEFAULT NULL COMMENT 'Array of Cloudinary URLs for return condition photos',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`return_id`),
  KEY `idx_asset_returns_assignment_id` (`assignment_id`),
  KEY `idx_asset_returns_user_id` (`user_id`),
  KEY `idx_asset_returns_return_location_id` (`return_location_id`),
  KEY `idx_asset_returns_return_location_room_id` (`return_location_room_id`),
  KEY `idx_asset_returns_return_department_id` (`return_department_id`),
  KEY `idx_asset_returns_return_batch_id` (`return_batch_id`),
  KEY `idx_asset_returns_form_id` (`form_id`),
  CONSTRAINT `fk_asset_returns_assignment_id` FOREIGN KEY (`assignment_id`) REFERENCES `asset_assignments` (`assignmentID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_returns_form_id` FOREIGN KEY (`form_id`) REFERENCES `asset_return_forms` (`formID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_returns_return_department_id` FOREIGN KEY (`return_department_id`) REFERENCES `asset_mngmnt_departments` (`departmentID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_returns_return_location_id` FOREIGN KEY (`return_location_id`) REFERENCES `asset_mngmnt_locations` (`locationID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_returns_return_location_room_id` FOREIGN KEY (`return_location_room_id`) REFERENCES `asset_mngmnt_location_rooms` (`roomID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_returns_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`userID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_returns`
--

LOCK TABLES `asset_returns` WRITE;
/*!40000 ALTER TABLE `asset_returns` DISABLE KEYS */;
INSERT INTO `asset_returns` VALUES ('22ec0766-1b99-4597-bbb2-7ee8d0641af1','ef803f15-0abb-4692-b3bb-c7d88553a368','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','deac41c0-bb84-4b76-8420-73d16474b13e','a24ec39d-2e9f-4dda-b3d8-fd4888179d50',NULL,'2026-03-03 01:15:31','2026-03-03 01:15:31',NULL),('3b518fe9-a329-45c5-afd7-bddd25b40677','683b6ea0-8052-4787-8c96-2746f6830d45','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','deac41c0-bb84-4b76-8420-73d16474b13e','a24ec39d-2e9f-4dda-b3d8-fd4888179d50',NULL,'2026-03-03 01:15:31','2026-03-03 01:15:31',NULL),('6bc923b8-994a-4d6a-8dbe-4cebcf8977bf','63877e92-5625-458e-bc13-8168445e25da','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','Returned for transfer','807229fe-f4df-11f0-9f53-18c04d003e97','807ff13d-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','2c23b03d-fa97-4ba0-8097-154c0efdf7e4','2c23b03d-fa97-4ba0-8097-154c0efdf7e4',NULL,'2026-03-03 01:33:25','2026-03-03 01:33:25',NULL),('6d145b1e-ac3f-41ee-af2c-b8f5c3d2aeb4','6200db68-82cd-4c88-a18b-49f8e8c9acef','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','Returned for transfer','807229fe-f4df-11f0-9f53-18c04d003e97','807ff13d-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','2c23b03d-fa97-4ba0-8097-154c0efdf7e4','2c23b03d-fa97-4ba0-8097-154c0efdf7e4',NULL,'2026-03-03 01:33:25','2026-03-03 01:33:25',NULL),('9bae8874-6ddb-4bad-bd7a-98fdce2252b3','5b6cfa96-720b-4774-a0d8-baa08ee58075','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','Returned for transfer','807229fe-f4df-11f0-9f53-18c04d003e97','807ff13d-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','2c23b03d-fa97-4ba0-8097-154c0efdf7e4','2c23b03d-fa97-4ba0-8097-154c0efdf7e4',NULL,'2026-03-03 01:33:25','2026-03-03 01:33:25',NULL),('a3df4dc4-ef22-475f-b4d8-5830df427a3d','adddd02f-82d8-4320-b029-b3cbbca8fe7d','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','deac41c0-bb84-4b76-8420-73d16474b13e','a24ec39d-2e9f-4dda-b3d8-fd4888179d50',NULL,'2026-03-03 01:15:31','2026-03-03 01:15:31',NULL),('c36651b0-eecd-4dee-9076-4c0defca2faa','e08da0ca-6ebb-43cb-bc69-67982ee269b3','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','deac41c0-bb84-4b76-8420-73d16474b13e','a24ec39d-2e9f-4dda-b3d8-fd4888179d50',NULL,'2026-03-03 01:15:31','2026-03-03 01:15:31',NULL),('cfd40d55-18b6-437d-9b75-0239550e3fd8','a15bf758-0bab-4e19-a5db-032d62f6ba22','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','deac41c0-bb84-4b76-8420-73d16474b13e','a24ec39d-2e9f-4dda-b3d8-fd4888179d50',NULL,'2026-03-03 01:15:31','2026-03-03 01:15:31',NULL),('ef814609-c0bb-4053-96bb-6209b086876d','bd9b3b84-b868-42f0-9b68-e522108dc8e8','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','deac41c0-bb84-4b76-8420-73d16474b13e','a24ec39d-2e9f-4dda-b3d8-fd4888179d50',NULL,'2026-03-03 01:15:31','2026-03-03 01:15:31',NULL);
/*!40000 ALTER TABLE `asset_returns` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-03  9:37:28
