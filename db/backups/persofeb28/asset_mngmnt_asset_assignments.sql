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
INSERT INTO `asset_assignments` VALUES ('0f44d098-1ee3-4fb0-8604-5efaa0d4c981','39649fe9-0fd2-11f1-888f-b42e99f23680','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','2026-02-22 17:44:26',NULL,NULL,'Transferred via asset transfer from Ryan MGDLT','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-02-22 17:44:26','2026-02-22 17:44:26',NULL),('18994c61-94e3-4007-9cf0-00ecb1126a29','28075deb-0fd2-11f1-888f-b42e99f23680','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','2026-02-22 17:39:41',NULL,NULL,'Transferred via asset transfer from Ryan MGDLT','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-02-22 17:39:41','2026-02-22 17:39:41',NULL),('2aa6496b-7bd2-447f-a477-615c34261713','306bc3e8-0fd2-11f1-888f-b42e99f23680','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','2026-02-22 17:44:26',NULL,NULL,'Transferred via asset transfer from Ryan MGDLT','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-02-22 17:44:26','2026-02-22 17:44:26',NULL),('37666210-336d-42dd-8ef3-f27f6e7d5c98','306bc3e8-0fd2-11f1-888f-b42e99f23680','c68d1fe0-2010-43a3-bd2c-b5c6cf01384a','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','2026-02-22 17:38:41',NULL,'2026-02-22 17:44:26','Assigned via asset issuance\nReturn notes: Returned by Ryan MGDLT for transfer, processed by Ryan Rey Magdalita\nReturn condition: Good','Returned','65abe729-c369-447e-a864-a8e98b74b842','2026-02-22 17:38:41','2026-02-22 17:44:26',NULL),('3e169cf4-ec05-4519-978e-129303198554','28075deb-0fd2-11f1-888f-b42e99f23680','c68d1fe0-2010-43a3-bd2c-b5c6cf01384a','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','2026-02-22 17:39:07',NULL,'2026-02-22 17:39:41','Assigned via asset issuance\nReturn notes: Returned by Ryan MGDLT for transfer, processed by Ryan Rey Magdalita\nReturn condition: Good','Returned','65abe729-c369-447e-a864-a8e98b74b842','2026-02-22 17:39:07','2026-02-22 17:39:41',NULL),('c2091efc-c2f1-45f5-998f-685a07a4463c','39649fe9-0fd2-11f1-888f-b42e99f23680','c68d1fe0-2010-43a3-bd2c-b5c6cf01384a','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','2026-02-22 17:38:41',NULL,'2026-02-22 17:44:26','Assigned via asset issuance\nReturn notes: Returned by Ryan MGDLT for transfer, processed by Ryan Rey Magdalita\nReturn condition: Good','Returned','65abe729-c369-447e-a864-a8e98b74b842','2026-02-22 17:38:41','2026-02-22 17:44:26',NULL),('e57ce48d-ea87-4e4c-8246-1050f0af9b9b','1e609f5f-0fd2-11f1-888f-b42e99f23680','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','2026-02-22 17:39:41',NULL,NULL,'Transferred via asset transfer from Ryan MGDLT','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-02-22 17:39:41','2026-02-22 17:39:41',NULL),('f73b40a1-5a4f-4a49-a680-dbb609842538','1e609f5f-0fd2-11f1-888f-b42e99f23680','c68d1fe0-2010-43a3-bd2c-b5c6cf01384a','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','2026-02-22 17:39:07',NULL,'2026-02-22 17:39:41','Assigned via asset issuance\nReturn notes: Returned by Ryan MGDLT for transfer, processed by Ryan Rey Magdalita\nReturn condition: Good','Returned','65abe729-c369-447e-a864-a8e98b74b842','2026-02-22 17:39:07','2026-02-22 17:39:41',NULL);
/*!40000 ALTER TABLE `asset_assignments` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-28 16:14:45
