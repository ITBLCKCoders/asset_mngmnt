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
INSERT INTO `assets` VALUES ('050839ba-07b7-11f1-bba3-84ba5998fe66','CMTH-ITOFE-OU-00012','dsa','dsa','7f42238c-cfd6-11f0-9d93-18c04d003e97','DataBlitz','b7e103bd-eced-11f0-b486-18c04d003e97','Redmi','dsaddsa','dsa',NULL,NULL,NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','70cbcf39-f4df-11f0-9f53-18c04d003e97','70eb8854-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-02-12 10:03:27','65abe729-c369-447e-a864-a8e98b74b842','2026-02-12 10:08:18','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('2502c008-07b7-11f1-bba3-84ba5998fe66','CMTH-ITOFE-OU-00013','das','dasdsasa','7f42238c-cfd6-11f0-9d93-18c04d003e97','Power Mac Center','eb8e5c5e-ecfe-11f0-b486-18c04d003e97','Epson','dsa','ds',NULL,NULL,NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-02-12 10:04:20','65abe729-c369-447e-a864-a8e98b74b842','2026-02-12 10:08:18','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('3cf176cc-07b6-11f1-bba3-84ba5998fe66','CMTH-ITOFE-OU-00004','habady','habady','7f42238c-cfd6-11f0-9d93-18c04d003e97','DataBlitz','855773a1-ecee-11f0-b486-18c04d003e97','Samsung','habady','habady',NULL,NULL,NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-02-12 09:57:51','65abe729-c369-447e-a864-a8e98b74b842','2026-02-12 10:08:18','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('549b74ea-07b7-11f1-bba3-84ba5998fe66','CMTH-ITOFE-OU-00014','ds','kksajjkhsaj','7f42238c-cfd6-11f0-9d93-18c04d003e97','DataBlitz','b7e103bd-eced-11f0-b486-18c04d003e97','Iphone','ewq','wqe',NULL,NULL,NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-02-12 10:05:40','65abe729-c369-447e-a864-a8e98b74b842','2026-02-12 10:08:18','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('58db7ef0-07b6-11f1-bba3-84ba5998fe66','CMTH-ITOFE-PRNTR-OU-00005','habadu','habadu','7f42238c-cfd6-11f0-9d93-18c04d003e97','PC Express','8065d281-eced-11f0-b486-18c04d003e97','Epson','sada','sad',NULL,NULL,NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Available','2026-02-12 09:58:38','65abe729-c369-447e-a864-a8e98b74b842','2026-02-12 12:35:53','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('6ce245ba-07b6-11f1-bba3-84ba5998fe66','CMTH-ITOFE-OU-00006','haha','haha','7f42238c-cfd6-11f0-9d93-18c04d003e97','PC Express','855773a1-ecee-11f0-b486-18c04d003e97','Samsung','dsad','dsad',NULL,NULL,NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-02-12 09:59:11','65abe729-c369-447e-a864-a8e98b74b842','2026-02-12 10:08:18','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('827ea41d-07b7-11f1-bba3-84ba5998fe66','CMTH-ITOFE-OU-00015','qweewq','eewewe','7f42238c-cfd6-11f0-9d93-18c04d003e97','PC Express','855773a1-ecee-11f0-b486-18c04d003e97','Samsung','dsadsdsadsa','dsd',NULL,NULL,NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-02-12 10:06:57','65abe729-c369-447e-a864-a8e98b74b842','2026-02-12 10:08:18','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('830db6ad-07b6-11f1-bba3-84ba5998fe66','CMTH-ITOFE-PRNTR-OU-00007','hahaha','haha','7f42238c-cfd6-11f0-9d93-18c04d003e97','PC Express','8065d281-eced-11f0-b486-18c04d003e97','Epson','dsa','dsa',NULL,NULL,NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-02-12 09:59:48','65abe729-c369-447e-a864-a8e98b74b842','2026-02-12 10:08:18','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('9a228aca-07b6-11f1-bba3-84ba5998fe66','CMTH-ITOFE-AIOPC-OU-00008','hajdsa','hajdsa','7f42238c-cfd6-11f0-9d93-18c04d003e97','DataBlitz','d054d056-cfd9-11f0-9d93-18c04d003e97','Acer','hajdsa','hajdsa',NULL,NULL,NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-02-12 10:00:27','65abe729-c369-447e-a864-a8e98b74b842','2026-02-12 10:08:18','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('9e1ff4bc-07b7-11f1-bba3-84ba5998fe66','CMTH-ITOFE-OU-00016','jhashjsdahjasd','jhdsjahjsdah','7f42238c-cfd6-11f0-9d93-18c04d003e97','PC Express','eb8e5c5e-ecfe-11f0-b486-18c04d003e97','Epson','asda','dsa',NULL,NULL,NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-02-12 10:07:43','65abe729-c369-447e-a864-a8e98b74b842','2026-02-12 10:08:18','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('ac73f252-07b6-11f1-bba3-84ba5998fe66','CMTH-ITOFE-PRNTR-OU-00009','dsada','dsad','7f42238c-cfd6-11f0-9d93-18c04d003e97','Octagon Computer Superstore','8065d281-eced-11f0-b486-18c04d003e97','Epson','dasdd','sad',NULL,NULL,NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-02-12 10:00:58','65abe729-c369-447e-a864-a8e98b74b842','2026-02-12 10:08:18','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('bbf1b2e8-07a4-11f1-bba3-84ba5998fe66','CMTH-ITOFE-LAP-OU-00001','hello','hello','7f42238c-cfd6-11f0-9d93-18c04d003e97','Unknown','d7fb363e-cfd9-11f0-9d93-18c04d003e97','Lenovo','hello','hello','https://res.cloudinary.com/dp0tpwusz/image/upload/v1770853953/avatars/oteuepaohtbuoaqbkmxy.png',NULL,NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-02-12 07:52:33','65abe729-c369-447e-a864-a8e98b74b842','2026-02-12 07:54:14','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('e120c8f7-07b6-11f1-bba3-84ba5998fe66','CMTH-ITOFE-OU-00010','hjshdjh','hjshdjh','7f42238c-cfd6-11f0-9d93-18c04d003e97','Octagon Computer Superstore','b7e103bd-eced-11f0-b486-18c04d003e97','Redmi','hjshdjh','hjshdjh',NULL,NULL,NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','4deffeb9-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Available','2026-02-12 10:02:26','65abe729-c369-447e-a864-a8e98b74b842','2026-02-12 12:35:53','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('ea1c9691-07a4-11f1-bba3-84ba5998fe66','CMTH-ITOFE-0226-00002','taena','taena','7f42238c-cfd6-11f0-9d93-18c04d003e97','PCWORTH','1302c164-ecff-11f0-b486-18c04d003e97','Logitech','habadu','habadu','https://res.cloudinary.com/dp0tpwusz/image/upload/v1770854030/avatars/z2clw5bcatfsaarbfgx1.png','2026-02-02',100000.00,100.00,'straight-line',3,33300.00,'2026-02-02','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,12,'Good','None','Assigned','2026-02-12 07:53:50','65abe729-c369-447e-a864-a8e98b74b842','2026-02-12 07:54:14','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,0),('f33a7915-07b6-11f1-bba3-84ba5998fe66','CMTH-ITOFE-MNPC-OU-00011','kdsajkdja','kdsajkdja','7f42238c-cfd6-11f0-9d93-18c04d003e97','Octagon Computer Superstore','e282d889-cfd9-11f0-9d93-18c04d003e97','Beelink','kdsajkdja','kdsajkdja',NULL,NULL,NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-02-12 10:02:57','65abe729-c369-447e-a864-a8e98b74b842','2026-02-12 10:08:18','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1),('f83b657f-07a6-11f1-bba3-84ba5998fe66','CMTH-ITOFE-LAP-OU-00003','tang ina mo','tang ina mo','7f42238c-cfd6-11f0-9d93-18c04d003e97','Unknown','d7fb363e-cfd9-11f0-9d93-18c04d003e97','Lenovo','tang ina mo','tang ina mo',NULL,NULL,NULL,0.00,NULL,NULL,0.00,NULL,'c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'Good','None','Assigned','2026-02-12 08:08:33','65abe729-c369-447e-a864-a8e98b74b842','2026-02-12 08:08:51','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,1);
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

-- Dump completed on 2026-02-12 13:02:31
