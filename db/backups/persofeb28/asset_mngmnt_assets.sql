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
-- Table structure for table `assets`
--

DROP TABLE IF EXISTS `assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assets` (
  `assetID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `asset_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `category_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplier` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `brand` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serial` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_url` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `purchase_date` date DEFAULT NULL,
  `asset_value` decimal(15,2) DEFAULT NULL,
  `salvage_value` decimal(15,2) DEFAULT '0.00',
  `depreciation_method` enum('straight-line','declining-balance','double-declining','units-of-production') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'straight-line',
  `useful_life_years` int DEFAULT NULL,
  `annual_depreciation` decimal(15,2) DEFAULT NULL,
  `depreciation_start_date` date DEFAULT NULL,
  `company_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_room_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `warranty_months` int DEFAULT NULL,
  `condition` enum('Excellent','Good','Fair','Poor','Damaged') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Good',
  `maintenance_schedule` enum('Monthly','Quarterly','Semi-Annual','Annually','As Needed','None') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'None',
  `status` enum('Available','In Use','Under Maintenance','Retired','Disposed','Lost','Assigned') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Available',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_old_unit` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Indicates if this is an old unit with unknown purchase date and asset value',
  PRIMARY KEY (`assetID`),
  KEY `category_id` (`category_id`),
  KEY `type_id` (`type_id`),
  KEY `company_id` (`company_id`),
  KEY `location_id` (`location_id`),
  KEY `location_room_id` (`location_room_id`),
  KEY `department_id` (`department_id`),
  KEY `asset_code` (`asset_code`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`),
  KEY `deleted_by` (`deleted_by`),
  CONSTRAINT `assets_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `asset_categories` (`categoryID`) ON DELETE SET NULL,
  CONSTRAINT `assets_ibfk_2` FOREIGN KEY (`type_id`) REFERENCES `asset_types` (`typeID`) ON DELETE SET NULL,
  CONSTRAINT `assets_ibfk_3` FOREIGN KEY (`company_id`) REFERENCES `companies` (`companyID`) ON DELETE SET NULL,
  CONSTRAINT `assets_ibfk_4` FOREIGN KEY (`location_id`) REFERENCES `asset_mngmnt_locations` (`locationID`) ON DELETE SET NULL,
  CONSTRAINT `assets_ibfk_5` FOREIGN KEY (`location_room_id`) REFERENCES `asset_mngmnt_location_rooms` (`roomID`) ON DELETE SET NULL,
  CONSTRAINT `assets_ibfk_6` FOREIGN KEY (`department_id`) REFERENCES `asset_mngmnt_departments` (`departmentID`) ON DELETE SET NULL,
  CONSTRAINT `assets_ibfk_7` FOREIGN KEY (`created_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL,
  CONSTRAINT `assets_ibfk_8` FOREIGN KEY (`updated_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL,
  CONSTRAINT `assets_ibfk_9` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assets`
--

LOCK TABLES `assets` WRITE;
/*!40000 ALTER TABLE `assets` DISABLE KEYS */;
INSERT INTO `assets` VALUES ('1e609f5f-0fd2-11f1-888f-b42e99f23680','CMTH-ITOFE-PRNTR-OU-00001','dasd','dsa','7f42238c-cfd6-11f0-9d93-18c04d003e97','Octagon Computer Superstore','8065d281-eced-11f0-b486-18c04d003e97','Epson','dsa','das',NULL,NULL,NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-02-22 17:37:35','65abe729-c369-447e-a864-a8e98b74b842','2026-02-22 17:39:41','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('28075deb-0fd2-11f1-888f-b42e99f23680','CMTH-ITOFE-DESKPC-OU-00002','dsd','ds','7f42238c-cfd6-11f0-9d93-18c04d003e97','Octagon Computer Superstore','c84ffa68-cfd9-11f0-9d93-18c04d003e97','Generic','da','dsa',NULL,NULL,NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-02-22 17:37:51','65abe729-c369-447e-a864-a8e98b74b842','2026-02-22 17:39:41','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('306bc3e8-0fd2-11f1-888f-b42e99f23680','CMTH-ADMOFE-DA-OU-00001','sada','da','b5394b15-cfd2-11f0-9d93-18c04d003e97','unknown','241efae7-0fc8-11f1-888f-b42e99f23680','das','da','dds',NULL,NULL,NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-02-22 17:38:05','65abe729-c369-447e-a864-a8e98b74b842','2026-02-22 17:44:26','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('39649fe9-0fd2-11f1-888f-b42e99f23680','CMTH-ADMOFE-DA-OU-00002','dsds','ds','b5394b15-cfd2-11f0-9d93-18c04d003e97','unknown','241efae7-0fc8-11f1-888f-b42e99f23680','das','dsdsd','dsds',NULL,NULL,NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-02-22 17:38:20','65abe729-c369-447e-a864-a8e98b74b842','2026-02-22 17:44:26','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1);
/*!40000 ALTER TABLE `assets` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-28 16:14:37
