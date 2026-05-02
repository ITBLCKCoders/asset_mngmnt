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
INSERT INTO `assets` VALUES ('0664d47f-f48b-11f0-906b-b42e99f23680','CMTH-ADMOFE-OU-00006','fdgfd','fhfgdh','b5394b15-cfd2-11f0-9d93-18c04d003e97','dsasd','42a7c937-f392-11f0-8089-b42e99f23680','asdsa','fdg','gfdgfd',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Available','2026-01-19 00:30:39','3e2657eb-baad-4653-bd2a-f163b3be6955','2026-01-19 03:07:42','3e2657eb-baad-4653-bd2a-f163b3be6955',NULL,NULL,1),('093c506c-f4a8-11f0-906b-b42e99f23680','CMTH-ITOFE-OU-00021','gfg','fgf','7f42238c-cfd6-11f0-9d93-18c04d003e97','Octagon Computer Superstore','eb8e5c5e-ecfe-11f0-b486-18c04d003e97','Epson','gf','gf',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-01-19 03:58:19','65abe729-c369-447e-a864-a8e98b74b842','2026-01-19 03:59:01','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('0ad02228-f45d-11f0-906b-b42e99f23680','CMTH-ITOFE-OU-00011','gds','gd','7f42238c-cfd6-11f0-9d93-18c04d003e97','Unknown','667bab1e-ed01-11f0-b486-18c04d003e97','Generic','dff','fd',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-01-18 19:01:29','65abe729-c369-447e-a864-a8e98b74b842','2026-01-18 19:03:49','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('156d5295-f45d-11f0-906b-b42e99f23680','CMTH-COM-OU-00012','hghg','hg','ddbd9d49-cfd2-11f0-9d93-18c04d003e97','Unkown','03a1383d-eced-11f0-b486-18c04d003e97','Logitech','gf','gf',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-01-18 19:01:47','65abe729-c369-447e-a864-a8e98b74b842','2026-01-18 19:03:49','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('1af8aae5-f476-11f0-906b-b42e99f23680','CMTH-ITOFE-OU-00016','dsf','fds','7f42238c-cfd6-11f0-9d93-18c04d003e97','PCWORTH','1302c164-ecff-11f0-b486-18c04d003e97','Logitech','fd','d',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-01-18 22:00:54','65abe729-c369-447e-a864-a8e98b74b842','2026-01-19 03:14:19','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('2a19c464-f4a7-11f0-906b-b42e99f23680','CMTH-ITOFE-OU-00018','gfdgfd','gfdfdg','7f42238c-cfd6-11f0-9d93-18c04d003e97','Unknown','667bab1e-ed01-11f0-b486-18c04d003e97','Generic','gfdgfd','dfgfd',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-01-19 03:52:05','65abe729-c369-447e-a864-a8e98b74b842','2026-01-19 03:52:31','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('3f90259b-f489-11f0-906b-b42e99f23680','CMTH-ADMOFE-OU-00005','hfhfd','hfdhfd','b5394b15-cfd2-11f0-9d93-18c04d003e97','dsasd','42a7c937-f392-11f0-8089-b42e99f23680','asdsa','hfh','hf',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Available','2026-01-19 00:17:56','3e2657eb-baad-4653-bd2a-f163b3be6955','2026-01-19 03:15:00','3e2657eb-baad-4653-bd2a-f163b3be6955',NULL,NULL,1),('4bd9d095-f47c-11f0-906b-b42e99f23680','CMTH-COM-OU-00017','dg','fdg','ddbd9d49-cfd2-11f0-9d93-18c04d003e97','Unkown','74460bff-ecef-11f0-b486-18c04d003e97','AOC','gf','gf',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-01-18 22:45:13','65abe729-c369-447e-a864-a8e98b74b842','2026-01-19 03:14:19','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('5800c44a-f468-11f0-906b-b42e99f23680','CMTH-ITOFE-OU-00015','dsf','fdfg','7f42238c-cfd6-11f0-9d93-18c04d003e97','PCWORTH','667bab1e-ed01-11f0-b486-18c04d003e97','Generic','dgdf','gfd',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-01-18 20:22:23','65abe729-c369-447e-a864-a8e98b74b842','2026-01-18 20:23:22','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('5aa1685e-f44e-11f0-906b-b42e99f23680','CMTH-GG-GF-OU-00003','gf','gf','c8cbfc8c-f3f6-11f0-9552-b42e99f23680','gf','329ef527-f44e-11f0-906b-b42e99f23680','gfg','gf','gf',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Available','2026-01-18 17:16:21','65abe729-c369-447e-a864-a8e98b74b842','2026-01-19 03:23:11','3e2657eb-baad-4653-bd2a-f163b3be6955',NULL,NULL,1),('65879a08-f4a7-11f0-906b-b42e99f23680','CMTH-ITOFE-OU-00019','hfgh','gfhgf','7f42238c-cfd6-11f0-9d93-18c04d003e97','Unknown','667bab1e-ed01-11f0-b486-18c04d003e97','Generic','hgf','hgf',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-01-19 03:53:44','65abe729-c369-447e-a864-a8e98b74b842','2026-01-19 03:53:59','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('7b56f76d-f4a8-11f0-906b-b42e99f23680','CMTH-ITOFE-MNPC-OU-00022','fdf','fd','7f42238c-cfd6-11f0-9d93-18c04d003e97','DataBlitz','e282d889-cfd9-11f0-9d93-18c04d003e97','Minisforum','fd','fd',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2026-01-19 04:01:30','65abe729-c369-447e-a864-a8e98b74b842','2026-01-19 04:03:56','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('7b6ec0b5-f462-11f0-906b-b42e99f23680','CMTH-ITOFE-OU-00014','gfhjgf','gjgf','7f42238c-cfd6-11f0-9d93-18c04d003e97','Power Mac Center','667bab1e-ed01-11f0-b486-18c04d003e97','Generic','0','0',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-01-18 19:40:26','65abe729-c369-447e-a864-a8e98b74b842','2026-01-18 19:40:39','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('9d2ee681-f45e-11f0-906b-b42e99f23680','CMTH-ITOFE-OU-00013','FD','FDGD','7f42238c-cfd6-11f0-9d93-18c04d003e97','Unknown','53709859-ed00-11f0-b486-18c04d003e97','Logitech','GF','GF',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-01-18 19:12:44','65abe729-c369-447e-a864-a8e98b74b842','2026-01-18 19:22:50','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('9f4b0cc8-f4a7-11f0-906b-b42e99f23680','CMTH-ITOFE-OU-00020','fdgfd','gfd','7f42238c-cfd6-11f0-9d93-18c04d003e97','PCWORTH','53709859-ed00-11f0-b486-18c04d003e97','Generic','gfd','gfd',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-01-19 03:55:21','65abe729-c369-447e-a864-a8e98b74b842','2026-01-19 03:56:04','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('a38eb0d0-f44d-11f0-906b-b42e99f23680','CMTH-ITOFE-OU-00009','fd','fd','7f42238c-cfd6-11f0-9d93-18c04d003e97','PCWORTH','667bab1e-ed01-11f0-b486-18c04d003e97','Generic','fd','fd',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-01-18 17:11:14','65abe729-c369-447e-a864-a8e98b74b842','2026-01-18 17:11:46','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('ae23cfeb-f44d-11f0-906b-b42e99f23680','CMTH-COM-OU-00010','hgf','gf','ddbd9d49-cfd2-11f0-9d93-18c04d003e97','Unkown','74460bff-ecef-11f0-b486-18c04d003e97','Samsung','fd','fd',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-01-18 17:11:31','65abe729-c369-447e-a864-a8e98b74b842','2026-01-18 17:11:46','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('f42c4b69-f45a-11f0-906b-b42e99f23680','CMTH-ADMOFE-OU-00004','das','dsa','b5394b15-cfd2-11f0-9d93-18c04d003e97','dsasd','42a7c937-f392-11f0-8089-b42e99f23680','asdsa','dsa','dsa',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Available','2026-01-18 18:46:32','65abe729-c369-447e-a864-a8e98b74b842','2026-01-19 03:15:46','3e2657eb-baad-4653-bd2a-f163b3be6955',NULL,NULL,1);
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

-- Dump completed on 2026-02-01 17:10:55
