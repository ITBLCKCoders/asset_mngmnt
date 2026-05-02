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
-- Table structure for table `companies`
--

DROP TABLE IF EXISTS `companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `companies` (
  `companyID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `prefix` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tax_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unit_no` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `building_street` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `barangay_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `province_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `region_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `zipcode` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `full_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `logo_url` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `industry` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'technology',
  `size` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '51-200',
  `is_active` tinyint(1) DEFAULT '0',
  `is_main` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`companyID`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_code` (`code`),
  KEY `idx_active` (`is_active`),
  KEY `idx_main` (`is_main`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `companies`
--

LOCK TABLES `companies` WRITE;
/*!40000 ALTER TABLE `companies` DISABLE KEYS */;
INSERT INTO `companies` VALUES ('21a225aa-cdbc-11f0-acd5-047c16a24f9f','Black Coders Group Inc.','BCGI@BCGI.com','002','BCGI',NULL,'+639323211233','BCGI.com','Unit 908, Antel Global Corporate Center','Dona Julia Vargas Ave., Oritgas Center','San Antonio','City of Pasig',NULL,'National Capital Region','1550',NULL,NULL,'https://res.cloudinary.com/dfz4kmem2/image/upload/v1764486833/avatars/cclrk4oqs8wqpbgufdhk.png','Information Technology Services','11–50 employees',0,0,'2025-11-30 15:13:55','550e8400-e29b-41d4-a716-446655440002','2026-02-24 14:30:23','550e8400-e29b-41d4-a716-446655440002',NULL,NULL),('52c8583a-cdbc-11f0-acd5-047c16a24f9f','Acquatro Suites','Acquatro Suites','006','ACQ',NULL,'+639321312321','Acquatrosuites.com','Unit 908, Antel Global Corporate Center','Dona Julia Vargas Ave., Oritgas Center','San Antonio','City of Pasig',NULL,'National Capital Region','1550',NULL,NULL,'https://res.cloudinary.com/dfz4kmem2/image/upload/v1764486916/avatars/patmklzwucgh5fkdzuik.png','Hospitality','501–1,000 employees',0,0,'2025-11-30 15:15:17','550e8400-e29b-41d4-a716-446655440002','2026-01-03 23:17:24','550e8400-e29b-41d4-a716-446655440002',NULL,NULL),('58ff6d30-cdbb-11f0-acd5-047c16a24f9f','GTCNow','GTCNow@GTCNow.com','001','GTC',NULL,'+639231312321','GTCNow.com','Unit 908, Antel Global Corporate Center','Dona Julia Vargas Ave., Oritgas Center','San Antonio','City of Pasig',NULL,'National Capital Region','1550',NULL,NULL,'https://res.cloudinary.com/dfz4kmem2/image/upload/v1764486497/avatars/ozios35szw92zphkugwf.png','Accounting','1–10 employees',0,0,'2025-11-30 15:08:18','550e8400-e29b-41d4-a716-446655440002','2026-02-19 13:50:08','550e8400-e29b-41d4-a716-446655440002',NULL,NULL),('851dacd9-cdbb-11f0-acd5-047c16a24f9f','CMTLand','CMTLand@CMTLand.com','003','CMTL',NULL,'+639312313213','CMTLand.com','Unit 908, Antel Global Corporate Center','Dona Julia Vargas Ave., Oritgas Center','San Antonio','City of Pasig',NULL,'National Capital Region','1550',NULL,NULL,'https://res.cloudinary.com/dfz4kmem2/image/upload/v1764486571/avatars/ljfpuxckqhnbu87qnhgj.png','Real Estate','11–50 employees',0,0,'2025-11-30 15:09:32','550e8400-e29b-41d4-a716-446655440002','2025-12-03 03:20:19','550e8400-e29b-41d4-a716-446655440002',NULL,NULL),('c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','CMTHoldings','CMTHoldings','005','CMTH',NULL,'+639321312313','CMTHoldings.com','Unit 908, Antel Global Corporate Center','Dona Julia Vargas Ave., Oritgas Center','San Antonio','City of Pasig',NULL,'National Capital Region','1550',NULL,NULL,'https://res.cloudinary.com/dfz4kmem2/image/upload/v1767454003/avatars/immfepsedvz9z2tgpzfe.png','Venture Capital & Private Equity','51–200 employees',1,1,'2025-11-30 15:11:17','550e8400-e29b-41d4-a716-446655440002','2026-02-24 14:30:23','452bbdf6-0760-4e2b-9175-4dc28ef11bb4',NULL,NULL),('ed93eac0-cdbb-11f0-acd5-047c16a24f9f','CMTBuilders','CMTBuilders@CMTBuilders.com','004','CMTB',NULL,'+639321321233','CMTBuilders.com','Unit 908, Antel Global Corporate Center','Dona Julia Vargas Ave., Oritgas Center','San Antonio','City of Pasig',NULL,'National Capital Region','1550',NULL,NULL,'https://res.cloudinary.com/dfz4kmem2/image/upload/v1764486747/avatars/vy7reqk1wmny2ew5r0ut.png','Construction','51–200 employees',0,0,'2025-11-30 15:12:27','550e8400-e29b-41d4-a716-446655440002','2026-01-03 23:27:04','550e8400-e29b-41d4-a716-446655440002',NULL,NULL);
/*!40000 ALTER TABLE `companies` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-26  8:23:52
