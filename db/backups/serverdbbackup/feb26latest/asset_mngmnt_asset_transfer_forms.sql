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
-- Table structure for table `asset_transfer_forms`
--

DROP TABLE IF EXISTS `asset_transfer_forms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_transfer_forms` (
  `formID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `form_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_room_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_assigned_user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `signed_at` datetime DEFAULT NULL,
  `signed_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `signed_digital_signature` text COLLATE utf8mb4_unicode_ci,
  `process_signed_at` datetime DEFAULT NULL,
  `process_digital_signature` text COLLATE utf8mb4_unicode_ci,
  `transfer_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `received_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dept_head_signed_at` datetime DEFAULT NULL,
  `dept_head_digital_signature` text COLLATE utf8mb4_unicode_ci,
  `dept_head_signed_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `it_manager_signed_at` datetime DEFAULT NULL,
  `it_manager_digital_signature` text COLLATE utf8mb4_unicode_ci,
  `it_manager_signed_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`formID`),
  UNIQUE KEY `form_number` (`form_number`),
  KEY `idx_asset_transfer_forms_user_id` (`user_id`),
  KEY `idx_asset_transfer_forms_created_at` (`created_at`),
  KEY `fk_asset_transfer_forms_department_id` (`department_id`),
  KEY `fk_asset_transfer_forms_location_id` (`location_id`),
  KEY `fk_asset_transfer_forms_location_room_id` (`location_room_id`),
  KEY `fk_asset_transfer_forms_new_assigned_user_id` (`new_assigned_user_id`),
  KEY `fk_asset_transfer_forms_created_by` (`created_by`),
  KEY `fk_asset_transfer_forms_signed_by` (`signed_by`),
  CONSTRAINT `fk_asset_transfer_forms_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL,
  CONSTRAINT `fk_asset_transfer_forms_department_id` FOREIGN KEY (`department_id`) REFERENCES `asset_mngmnt_departments` (`departmentID`) ON DELETE SET NULL,
  CONSTRAINT `fk_asset_transfer_forms_location_id` FOREIGN KEY (`location_id`) REFERENCES `asset_mngmnt_locations` (`locationID`) ON DELETE SET NULL,
  CONSTRAINT `fk_asset_transfer_forms_location_room_id` FOREIGN KEY (`location_room_id`) REFERENCES `asset_mngmnt_location_rooms` (`roomID`) ON DELETE SET NULL,
  CONSTRAINT `fk_asset_transfer_forms_new_assigned_user_id` FOREIGN KEY (`new_assigned_user_id`) REFERENCES `users` (`userID`) ON DELETE SET NULL,
  CONSTRAINT `fk_asset_transfer_forms_signed_by` FOREIGN KEY (`signed_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL,
  CONSTRAINT `fk_asset_transfer_forms_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`userID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_transfer_forms`
--

LOCK TABLES `asset_transfer_forms` WRITE;
/*!40000 ALTER TABLE `asset_transfer_forms` DISABLE KEYS */;
/*!40000 ALTER TABLE `asset_transfer_forms` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-26 13:53:34
