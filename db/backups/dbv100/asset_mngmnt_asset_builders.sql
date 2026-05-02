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
-- Table structure for table `asset_builders`
--

DROP TABLE IF EXISTS `asset_builders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_builders` (
  `builderID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('Available','Assigned') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Available',
  `company_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`builderID`),
  KEY `company_id` (`company_id`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`),
  KEY `deleted_by` (`deleted_by`),
  CONSTRAINT `asset_builders_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`companyID`) ON DELETE SET NULL,
  CONSTRAINT `asset_builders_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL,
  CONSTRAINT `asset_builders_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL,
  CONSTRAINT `asset_builders_ibfk_4` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_builders`
--

LOCK TABLES `asset_builders` WRITE;
/*!40000 ALTER TABLE `asset_builders` DISABLE KEYS */;
INSERT INTO `asset_builders` VALUES ('032b8b72-3f3d-11f1-a473-00ffff729f5c','dasd09093342',NULL,'Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-04-24 01:51:10','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','2026-04-24 02:21:02','38b6ecb2-4f95-4307-bc90-9d2f54d2c133',NULL,NULL),('6b9f6506-3f3d-11f1-a473-00ffff729f5c','fdsf',NULL,'Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-04-24 01:54:05','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','2026-04-24 02:11:21','38b6ecb2-4f95-4307-bc90-9d2f54d2c133',NULL,NULL),('72b81e67-404b-11f1-bb64-00ffff729f5c','Laptp1',NULL,'Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-04-25 10:07:01','65abe729-c369-447e-a864-a8e98b74b842','2026-04-25 10:11:38','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('e82953f7-3ff9-11f1-bb64-00ffff729f5c','ewerew',NULL,'Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-04-25 00:23:19','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','2026-04-25 00:32:35','38b6ecb2-4f95-4307-bc90-9d2f54d2c133',NULL,NULL);
/*!40000 ALTER TABLE `asset_builders` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-27  8:56:27
