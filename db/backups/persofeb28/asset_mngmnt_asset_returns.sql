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
  `return_batch_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
INSERT INTO `asset_returns` VALUES ('2f0db1a9-ebbb-4c56-ad89-4caf3e756064','37666210-336d-42dd-8ef3-f27f6e7d5c98','c68d1fe0-2010-43a3-bd2c-b5c6cf01384a','Good','Returned for transfer','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','e557f72e-034d-4580-a2bc-bd19b009d6bd','e557f72e-034d-4580-a2bc-bd19b009d6bd',NULL,'2026-02-22 09:44:26','2026-02-22 09:44:26',NULL),('66c10668-117e-4f34-b6e4-d51dcb5c9ba6','f73b40a1-5a4f-4a49-a680-dbb609842538','c68d1fe0-2010-43a3-bd2c-b5c6cf01384a','Good','Returned for transfer','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','56cfdc08-3146-4376-81c3-b422cac63c39','56cfdc08-3146-4376-81c3-b422cac63c39',NULL,'2026-02-22 09:39:41','2026-02-22 09:39:41',NULL),('74378b4f-7889-4d7f-8e6b-9d0249df24b1','c2091efc-c2f1-45f5-998f-685a07a4463c','c68d1fe0-2010-43a3-bd2c-b5c6cf01384a','Good','Returned for transfer','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','e557f72e-034d-4580-a2bc-bd19b009d6bd','e557f72e-034d-4580-a2bc-bd19b009d6bd',NULL,'2026-02-22 09:44:26','2026-02-22 09:44:26',NULL),('fcb31084-cd4c-48cf-98b7-2649e35a6370','3e169cf4-ec05-4519-978e-129303198554','c68d1fe0-2010-43a3-bd2c-b5c6cf01384a','Good','Returned for transfer','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','56cfdc08-3146-4376-81c3-b422cac63c39','56cfdc08-3146-4376-81c3-b422cac63c39',NULL,'2026-02-22 09:39:41','2026-02-22 09:39:41',NULL);
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

-- Dump completed on 2026-02-28 16:14:32
