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
INSERT INTO `asset_returns` VALUES ('1c0629e7-481b-4685-96c7-86382bac100d','3ece0f41-5a9f-4a3b-aa71-afaaefc99de7','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,'cb41ea27-90f4-48ff-a3b4-178a8fd09de4',NULL,'2026-04-24 18:11:05','2026-04-24 18:18:49',NULL),('5e15151a-ddea-4828-8401-ee7c26c731a5','e0e08c86-7c5b-47c1-8d02-8cd834f7264c','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,'a767eef3-62be-42bb-b6f2-4668c67d8d7c',NULL,'2026-04-25 02:50:25','2026-04-25 02:50:25',NULL),('7bd00cf8-cc1e-4efc-bedb-867f76074fe9','b7580f93-fd39-4778-8c4c-41e6f311285a','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','','af3a1d62-00a6-11f1-a629-b8cb29c59adf','af3eb0d3-00a6-11f1-a629-b8cb29c59adf','1e901f22-cfd8-11f0-9d93-18c04d003e97','aa5b8d5c-d3ee-4ab8-9b99-52f712569fc0','20b4dc76-f996-4797-8fe3-6984681fb43b',NULL,'2026-04-25 02:46:07','2026-04-25 02:47:41',NULL),('938b318e-92e4-4a25-9c7c-8b45bb997cc0','cf15e293-f8f0-48fc-98c2-0e6e67a2167a','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,'0102c404-606a-429d-a21d-a4d484ad0dd2',NULL,'2026-04-25 02:19:25','2026-04-25 02:27:46',NULL),('98c422ee-3c74-45ff-a99d-f0708bda995e','6ae055aa-4875-4dde-ae54-212fdcd85843','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','Good','','af3a1d62-00a6-11f1-a629-b8cb29c59adf','af3eb0d3-00a6-11f1-a629-b8cb29c59adf','1e901f22-cfd8-11f0-9d93-18c04d003e97',NULL,'a767eef3-62be-42bb-b6f2-4668c67d8d7c',NULL,'2026-04-25 02:50:25','2026-04-25 02:50:25',NULL),('a8f44d62-32c8-49c5-878d-000918410de7','b7580f93-fd39-4778-8c4c-41e6f311285a','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','f3d10322-7662-4617-b6df-126fcd991bbc','8beeaa20-849f-47be-abce-471db526a6de',NULL,'2026-04-24 18:20:13','2026-04-24 18:20:13',NULL),('b6afc8f9-0f5e-4f2a-a3fa-1cee85bba2ed','b7d3b942-3298-4fa1-8135-1abe81a274bd','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,'0102c404-606a-429d-a21d-a4d484ad0dd2',NULL,'2026-04-25 02:19:25','2026-04-25 02:27:46',NULL),('d459c9e0-6626-48ff-98aa-3ee9781ec82b','7f907701-2c27-4969-98b2-707536b230f9','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,'cb41ea27-90f4-48ff-a3b4-178a8fd09de4',NULL,'2026-04-24 18:11:05','2026-04-24 18:18:49',NULL),('e2bd64dd-c70e-462d-b45d-1cf6a3e9794c','85560859-d844-4f7d-8d5c-251813534fe6','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,'0102c404-606a-429d-a21d-a4d484ad0dd2',NULL,'2026-04-25 02:19:25','2026-04-25 02:27:46',NULL);
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

-- Dump completed on 2026-04-27  8:56:29
