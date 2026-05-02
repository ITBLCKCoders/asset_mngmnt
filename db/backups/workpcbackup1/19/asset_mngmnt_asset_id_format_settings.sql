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
-- Table structure for table `asset_id_format_settings`
--

DROP TABLE IF EXISTS `asset_id_format_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_id_format_settings` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `company_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_format` enum('code','prefix','none') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'code',
  `category_format` enum('prefix','code','none') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'prefix',
  `type_format` enum('prefix','code','none') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'prefix',
  `department_format` enum('code','prefix','none') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'none',
  `include_date` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`),
  KEY `deleted_by` (`deleted_by`),
  CONSTRAINT `asset_id_format_settings_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`companyID`) ON DELETE CASCADE,
  CONSTRAINT `asset_id_format_settings_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL,
  CONSTRAINT `asset_id_format_settings_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL,
  CONSTRAINT `asset_id_format_settings_ibfk_4` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_id_format_settings`
--

LOCK TABLES `asset_id_format_settings` WRITE;
/*!40000 ALTER TABLE `asset_id_format_settings` DISABLE KEYS */;
INSERT INTO `asset_id_format_settings` VALUES ('44e979db-db9e-11f0-a44e-18c04d003e97','21a225aa-cdbc-11f0-acd5-047c16a24f9f','prefix','prefix','prefix','none',1,'2025-12-18 07:15:25','65abe729-c369-447e-a864-a8e98b74b842','2025-12-18 07:15:25','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('4eadbb12-cfdc-11f0-9d93-18c04d003e97','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','prefix','prefix','prefix','none',1,'2025-12-03 08:09:16','65abe729-c369-447e-a864-a8e98b74b842','2025-12-05 07:21:45','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('60b2723f-cf93-11f0-88c2-047c16a24f9f','52c8583a-cdbc-11f0-acd5-047c16a24f9f','code','prefix','prefix','none',1,'2025-12-02 23:27:13','65abe729-c369-447e-a864-a8e98b74b842','2025-12-02 23:27:28','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('7638be14-da55-11f0-a44e-18c04d003e97','52c8583a-cdbc-11f0-acd5-047c16a24f9f','prefix','prefix','prefix','none',1,'2025-12-16 16:01:43','65abe729-c369-447e-a864-a8e98b74b842','2025-12-16 16:01:43','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('9e546d0e-d0b8-11f0-ad39-18c04d003e97','ed93eac0-cdbb-11f0-acd5-047c16a24f9f','prefix','prefix','prefix','prefix',0,'2025-12-04 10:26:19','65abe729-c369-447e-a864-a8e98b74b842','2025-12-04 10:26:19','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL);
/*!40000 ALTER TABLE `asset_id_format_settings` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-19  7:18:40
