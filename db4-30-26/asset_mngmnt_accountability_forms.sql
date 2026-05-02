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
-- Table structure for table `accountability_forms`
--

DROP TABLE IF EXISTS `accountability_forms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accountability_forms` (
  `formID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `form_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `assignment_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `asset_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_room_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('Pending','Signed','Completed','Revoked','Disabled','Declined') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Pending',
  `decline_reason` text COLLATE utf8mb4_unicode_ci,
  `acknowledgments` json DEFAULT NULL COMMENT 'Contains user signature and other acknowledgment data (NOT issuer signature)',
  `issuer_signature` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `it_copy_signature` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `received_copy_201_file_signature` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `received_copy_201_file_signed_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assets_data` json DEFAULT NULL COMMENT 'Contains asset information for accountability forms',
  `signed_at` datetime DEFAULT NULL,
  `signed_ip` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `signed_user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `received_copy_201_file_signed_by_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `received_copy_201_file_signed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`formID`),
  UNIQUE KEY `form_number` (`form_number`),
  KEY `asset_id` (`asset_id`),
  KEY `user_id` (`user_id`),
  KEY `department_id` (`department_id`),
  KEY `location_id` (`location_id`),
  KEY `location_room_id` (`location_room_id`),
  KEY `created_by` (`created_by`),
  KEY `accountability_forms_ibfk_1` (`assignment_id`),
  KEY `idx_accountability_forms_issuer_signature` (`issuer_signature`(255)),
  CONSTRAINT `accountability_forms_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `asset_assignments` (`assignmentID`) ON DELETE CASCADE,
  CONSTRAINT `accountability_forms_ibfk_2` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`assetID`) ON DELETE CASCADE,
  CONSTRAINT `accountability_forms_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`userID`) ON DELETE CASCADE,
  CONSTRAINT `accountability_forms_ibfk_4` FOREIGN KEY (`department_id`) REFERENCES `asset_mngmnt_departments` (`departmentID`) ON DELETE SET NULL,
  CONSTRAINT `accountability_forms_ibfk_5` FOREIGN KEY (`location_id`) REFERENCES `asset_mngmnt_locations` (`locationID`) ON DELETE SET NULL,
  CONSTRAINT `accountability_forms_ibfk_6` FOREIGN KEY (`location_room_id`) REFERENCES `asset_mngmnt_location_rooms` (`roomID`) ON DELETE SET NULL,
  CONSTRAINT `accountability_forms_ibfk_7` FOREIGN KEY (`created_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accountability_forms`
--

LOCK TABLES `accountability_forms` WRITE;
/*!40000 ALTER TABLE `accountability_forms` DISABLE KEYS */;
/*!40000 ALTER TABLE `accountability_forms` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-30  9:44:57
