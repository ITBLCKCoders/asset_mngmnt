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
INSERT INTO `assets` VALUES ('273f8121-dbe5-11f0-9598-b8cb29c59adf','CMTH-ITOFE-LPTP-OU-00022','Lenovo LNVNB161216 Laptop','Cruz, Marriah Monique','7f42238c-cfd6-11f0-9d93-18c04d003e97','UNKWON2','d7fb363e-cfd9-11f0-9d93-18c04d003e97','Lenovo','0','0',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2025-12-18 07:42:50','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-18 15:42:50','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1),('29299153-dbde-11f0-9598-b8cb29c59adf','CMTH-COM-MS-OU-00009','Philips Mouse','Bellen, Zyra','ddbd9d49-cfd2-11f0-9d93-18c04d003e97','UNKNOWN2','7145b980-dbd5-11f0-9598-b8cb29c59adf','Generic','0','0',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2025-12-18 06:52:46','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-18 14:52:46','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1),('29c60df6-dbe3-11f0-9598-b8cb29c59adf','CMTH-COM-MS-OU-00013','Logitech Mouse','Burog, Aries B.','ddbd9d49-cfd2-11f0-9d93-18c04d003e97','UNKNOWN2','7145b980-dbd5-11f0-9598-b8cb29c59adf','Logitech','0','0',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2025-12-18 07:28:35','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-18 15:28:35','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1),('2f849ccc-dbe4-11f0-9598-b8cb29c59adf','CMTH-ITOFE-LPTP-OU-00017','Laptop, Dell Brand','Carmelo, Rexon','7f42238c-cfd6-11f0-9d93-18c04d003e97','UNKWON2','d7fb363e-cfd9-11f0-9d93-18c04d003e97','Dell','0','0',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2025-12-18 07:35:54','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-18 15:35:54','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1),('34ca9226-dbdc-11f0-9598-b8cb29c59adf','CMTH-COM-MS-OU-00005','A4TECH Mouse','Alyssa Katrina Alvarez','ddbd9d49-cfd2-11f0-9d93-18c04d003e97','UNKNOWN2','7145b980-dbd5-11f0-9598-b8cb29c59adf','A4 Tech','0','0',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2025-12-18 06:38:47','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-18 14:38:47','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1),('459ad5f2-dbd8-11f0-9598-b8cb29c59adf','CMTH-ITOFE-LPTP-OU-00001','Dell Alienware','Aguila, Maria Teresa','7f42238c-cfd6-11f0-9d93-18c04d003e97','Unknown','d7fb363e-cfd9-11f0-9d93-18c04d003e97','Dell','000000','000000',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2025-12-18 06:10:37','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-18 14:10:37','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1),('4a04ee02-dbdf-11f0-9598-b8cb29c59adf','CMTH-NET-NVR-OU-00010','TRY','TRY','61ec2a27-dbd6-11f0-9598-b8cb29c59adf','UNKNOWN','c685fdb1-dbd6-11f0-9598-b8cb29c59adf','Generic','0','0',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Assigned','2025-12-18 07:00:51','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-18 15:01:10','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1),('51c702a8-dbe5-11f0-9598-b8cb29c59adf','CMTH-COM-MS-OU-00023','OP-720 Mouse','Cruz, Marriah Monique','ddbd9d49-cfd2-11f0-9d93-18c04d003e97','UNKNOWN2','7145b980-dbd5-11f0-9598-b8cb29c59adf','Generic','0','0',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2025-12-18 07:44:01','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-18 15:44:01','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1),('51e66ff4-dbda-11f0-9598-b8cb29c59adf','CMTH-COM-MS-OU-00002','Mouse Alienware','Aguila, Maria Teresa','ddbd9d49-cfd2-11f0-9d93-18c04d003e97','UNKNOWN2','7145b980-dbd5-11f0-9598-b8cb29c59adf','Alienware','000000','0000000',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2025-12-18 06:25:17','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-18 14:25:17','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1),('5e009d8f-dbe4-11f0-9598-b8cb29c59adf','CMTH-ITOFE-PRNTR-OU-00018','Epson l5290','Liwag , Paula Rose','7f42238c-cfd6-11f0-9d93-18c04d003e97','UNKWON2','b3019b16-dbd5-11f0-9598-b8cb29c59adf','EPSON','0','0',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2025-12-18 07:37:12','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-18 15:37:12','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1),('69a1217a-dbdc-11f0-9598-b8cb29c59adf','CMTH-ITOFE-LPTP-OU-00006','G5 P82f 5100','Ana Luisa Oledan','7f42238c-cfd6-11f0-9d93-18c04d003e97','UNKWON2','d7fb363e-cfd9-11f0-9d93-18c04d003e97','Dell','0','0',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2025-12-18 06:40:15','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-18 14:40:15','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1),('7b99e38b-dbe3-11f0-9598-b8cb29c59adf','CMTH-ITOFE-PRNTR-OU-00014','Epson L6490 Printer','Burog, Aries B.','7f42238c-cfd6-11f0-9d93-18c04d003e97','UNKWON2','b3019b16-dbd5-11f0-9598-b8cb29c59adf','EPSON','0','0',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2025-12-18 07:30:52','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-18 15:30:52','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1),('7e8622c6-dc81-11f0-9598-b8cb29c59adf','CMTH-ITOFE-LPTP-OU-00024','Laptop, Dell  0GMW80','De Guzman, Elena A.','7f42238c-cfd6-11f0-9d93-18c04d003e97','UNKWON2','d7fb363e-cfd9-11f0-9d93-18c04d003e97','Dell','0','0',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','afc9e8ea-dbd7-11f0-9598-b8cb29c59adf','4a7fff54-dc81-11f0-9598-b8cb29c59adf','1e901f22-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2025-12-19 02:21:57','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-19 10:21:58','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1),('8bd40d27-dbe4-11f0-9598-b8cb29c59adf','CMTH-ITOFE-LPTP-OU-00019','Dell Inc. Inspiron 15-3000 Laptop','Liwag , Paula Rose','7f42238c-cfd6-11f0-9d93-18c04d003e97','UNKWON2','d7fb363e-cfd9-11f0-9d93-18c04d003e97','Dell','0','0',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2025-12-18 07:38:29','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-18 15:38:29','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1),('a09094fd-dbda-11f0-9598-b8cb29c59adf','CMTH-COM-LPCHRGR-OU-00003','Dell Laptop Charger','Aguila, Maria Teresa','ddbd9d49-cfd2-11f0-9d93-18c04d003e97','UNKNOWN2','7e3438e8-dbda-11f0-9598-b8cb29c59adf','Dell','00000000','000000000',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2025-12-18 06:27:29','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-18 14:27:29','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1),('a223c7fe-dbe3-11f0-9598-b8cb29c59adf','CMTH-ITOFE-PRNTR-OU-00015','Epson L3250 Printer','Burog, Aries B.','7f42238c-cfd6-11f0-9d93-18c04d003e97','UNKWON2','b3019b16-dbd5-11f0-9598-b8cb29c59adf','EPSON','0','0',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2025-12-18 07:31:57','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-18 15:31:57','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1),('bc49abe6-dbe4-11f0-9598-b8cb29c59adf','CMTH-COM-MS-OU-00020','Mouse','Liwag , Paula Rose','ddbd9d49-cfd2-11f0-9d93-18c04d003e97','UNKNOWN2','7145b980-dbd5-11f0-9598-b8cb29c59adf','Generic','0','0',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2025-12-18 07:39:50','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-18 15:39:50','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1),('ccbe4dfc-dbdb-11f0-9598-b8cb29c59adf','CMTH-ITOFE-LPTP-OU-00004','Lenovo Laptop','Alyssa Katrina Alvarez','7f42238c-cfd6-11f0-9d93-18c04d003e97','UNKWON2','d7fb363e-cfd9-11f0-9d93-18c04d003e97','Lenovo','0000000000','0',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2025-12-18 06:35:52','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-18 14:35:52','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1),('d4b389f8-dbe2-11f0-9598-b8cb29c59adf','CMTH-ITOFE-LPTP-OU-00011','Laptop, Lenovo ideapad 15sITL','Burog, Aries B.','7f42238c-cfd6-11f0-9d93-18c04d003e97','UNKWON2','d7fb363e-cfd9-11f0-9d93-18c04d003e97','Lenovo','0','0',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2025-12-18 07:26:12','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-18 15:26:12','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1),('e798faa8-dbdc-11f0-9598-b8cb29c59adf','CMTH-ITOFE-AIOPC-OU-00007','Desktop Computer (customized)','Bellen, Zyra','7f42238c-cfd6-11f0-9d93-18c04d003e97','UNKWON2','d054d056-cfd9-11f0-9d93-18c04d003e97','Customized','0','0',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2025-12-18 06:43:47','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-18 14:43:47','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1),('f18a9490-dbe4-11f0-9598-b8cb29c59adf','CMTH-ITOFE-TV-OU-00021','Samsung TV','Villarosa, Jhon Bert','7f42238c-cfd6-11f0-9d93-18c04d003e97','UNKWON2','f8d4d082-dbd5-11f0-9598-b8cb29c59adf','Samsung','0','0',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2025-12-18 07:41:19','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-18 15:41:19','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1),('f51b9783-dbdd-11f0-9598-b8cb29c59adf','CMTH-COM-KB-OU-00008','Philips Keyboard','Bellen, Zyra','ddbd9d49-cfd2-11f0-9d93-18c04d003e97','UNKNOWN2','84467c99-dbd5-11f0-9598-b8cb29c59adf','Generic','0','0',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2025-12-18 06:51:19','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-18 14:51:19','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1),('f8be2404-dbe3-11f0-9598-b8cb29c59adf','CMTH-ITOFE-CP-OU-00016','iPhone XR Smart Phone','Burog, Aries B.\r\nPhone number:  0917-126-7688','7f42238c-cfd6-11f0-9d93-18c04d003e97','UNKWON2','cbc30e40-dbe3-11f0-9598-b8cb29c59adf','Apple','0','0',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2025-12-18 07:34:22','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-18 15:34:22','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1),('fce23702-dbe2-11f0-9598-b8cb29c59adf','CMTH-COM-KB-OU-00012','Logitech Keyboard','Burog, Aries B.','ddbd9d49-cfd2-11f0-9d93-18c04d003e97','UNKNOWN2','84467c99-dbd5-11f0-9598-b8cb29c59adf','Logitech','0','0',NULL,'2000-01-01',NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','As Needed','Available','2025-12-18 07:27:20','cc925af6-8214-4717-a539-1f1dc21386df','2025-12-18 15:27:20','cc925af6-8214-4717-a539-1f1dc21386df',NULL,NULL,1);
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

-- Dump completed on 2025-12-19 16:03:02
