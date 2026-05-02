CREATE DATABASE  IF NOT EXISTS `asset_mngmnt` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `asset_mngmnt`;
-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: asset_mngmnt
-- ------------------------------------------------------
-- Server version	8.0.45

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
INSERT INTO `asset_assignments` VALUES ('2051ce93-e156-4fb8-afce-1b94b3fbd817','ac35f4df-3f8f-11f1-a473-00ffff729f5c','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','2026-04-25 10:27:46',NULL,NULL,'Assigned via asset return (assign to processor)','Active','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','2026-04-25 10:27:46','2026-04-25 10:27:46',NULL),('3ece0f41-5a9f-4a3b-aa71-afaaefc99de7','f5a9c63d-3fa9-11f1-b309-00ffff729f5c','86caed5e-b6f8-442a-8423-168d9ad4a579','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','2026-04-25 02:07:31',NULL,'2026-04-25 02:18:49','Assigned via asset issuance\nReturn notes: \nReturn condition: Good','Returned','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','2026-04-25 02:07:31','2026-04-25 02:18:49',NULL),('6ae055aa-4875-4dde-ae54-212fdcd85843','3e1f1f69-3fac-11f1-b309-00ffff729f5c','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','1e901f22-cfd8-11f0-9d93-18c04d003e97','af3a1d62-00a6-11f1-a629-b8cb29c59adf','af3eb0d3-00a6-11f1-a629-b8cb29c59adf','2026-04-25 02:07:03',NULL,NULL,'Assigned via asset issuance','Active','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','2026-04-25 02:07:03','2026-04-25 02:07:03',NULL),('76a011ab-4a19-4f17-852c-ead4c79b761f','ddc41c4f-3fa9-11f1-b309-00ffff729f5c','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','1e901f22-cfd8-11f0-9d93-18c04d003e97','af3a1d62-00a6-11f1-a629-b8cb29c59adf','af3eb0d3-00a6-11f1-a629-b8cb29c59adf','2026-04-25 10:47:41',NULL,NULL,'Assigned via asset return (assign to processor)','Active','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','2026-04-25 10:47:41','2026-04-25 10:47:41',NULL),('7f907701-2c27-4969-98b2-707536b230f9','ddac8482-3f8f-11f1-a473-00ffff729f5c','86caed5e-b6f8-442a-8423-168d9ad4a579','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','2026-04-25 02:07:31',NULL,'2026-04-25 02:18:49','Assigned via asset issuance\nReturn notes: \nReturn condition: Good','Returned','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','2026-04-25 02:07:31','2026-04-25 02:18:49',NULL),('85560859-d844-4f7d-8d5c-251813534fe6','889593b6-3f8f-11f1-a473-00ffff729f5c','86caed5e-b6f8-442a-8423-168d9ad4a579','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','2026-04-25 10:11:38',NULL,'2026-04-25 10:27:46','Assigned via asset issuance\nReturn notes: \nReturn condition: Good','Returned','65abe729-c369-447e-a864-a8e98b74b842','2026-04-25 10:11:38','2026-04-25 10:27:46',NULL),('b7112761-67a2-4a1d-bc4b-eb7c6c66889e','889593b6-3f8f-11f1-a473-00ffff729f5c','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','2026-04-25 10:27:46',NULL,NULL,'Assigned via asset return (assign to processor)','Active','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','2026-04-25 10:27:46','2026-04-25 10:27:46',NULL),('b7580f93-fd39-4778-8c4c-41e6f311285a','ddc41c4f-3fa9-11f1-b309-00ffff729f5c','86caed5e-b6f8-442a-8423-168d9ad4a579','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','2026-04-25 02:07:31',NULL,'2026-04-25 10:47:41','Assigned via asset issuance\nReturn notes: \nReturn condition: Good','Returned','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','2026-04-25 02:07:31','2026-04-25 10:47:41',NULL),('b7d3b942-3298-4fa1-8135-1abe81a274bd','ac35f4df-3f8f-11f1-a473-00ffff729f5c','86caed5e-b6f8-442a-8423-168d9ad4a579','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','2026-04-25 10:11:38',NULL,'2026-04-25 10:27:46','Assigned via asset issuance\nReturn notes: \nReturn condition: Good','Returned','65abe729-c369-447e-a864-a8e98b74b842','2026-04-25 10:11:38','2026-04-25 10:27:46',NULL),('cf15e293-f8f0-48fc-98c2-0e6e67a2167a','62468edd-404b-11f1-bb64-00ffff729f5c','86caed5e-b6f8-442a-8423-168d9ad4a579','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','2026-04-25 10:11:38',NULL,'2026-04-25 10:27:46','Assigned via asset issuance\nReturn notes: \nReturn condition: Good','Returned','65abe729-c369-447e-a864-a8e98b74b842','2026-04-25 10:11:38','2026-04-25 10:27:46',NULL),('cf591b72-fde2-4316-8b83-d46168160827','ddac8482-3f8f-11f1-a473-00ffff729f5c','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','2026-04-25 02:18:49',NULL,NULL,'Assigned via asset return (assign to processor)','Active','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','2026-04-25 02:18:49','2026-04-25 02:18:49',NULL),('d740d1fd-5d6a-452c-9f98-77ab1e4c73f0','62468edd-404b-11f1-bb64-00ffff729f5c','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','2026-04-25 10:27:46',NULL,NULL,'Assigned via asset return (assign to processor)','Active','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','2026-04-25 10:27:46','2026-04-25 10:27:46',NULL),('e0e08c86-7c5b-47c1-8d02-8cd834f7264c','f5a9c63d-3fa9-11f1-b309-00ffff729f5c','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','2026-04-25 02:18:49',NULL,NULL,'Assigned via asset return (assign to processor)','Active','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','2026-04-25 02:18:49','2026-04-25 02:18:49',NULL);
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

-- Dump completed on 2026-04-27  8:56:30
