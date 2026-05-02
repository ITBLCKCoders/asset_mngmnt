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
-- Table structure for table `asset_builder_items`
--

DROP TABLE IF EXISTS `asset_builder_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_builder_items` (
  `itemID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `builder_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `asset_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`itemID`),
  KEY `builder_id` (`builder_id`),
  KEY `asset_id` (`asset_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `asset_builder_items_ibfk_1` FOREIGN KEY (`builder_id`) REFERENCES `asset_builders` (`builderID`) ON DELETE CASCADE,
  CONSTRAINT `asset_builder_items_ibfk_2` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`assetID`) ON DELETE CASCADE,
  CONSTRAINT `asset_builder_items_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_builder_items`
--

LOCK TABLES `asset_builder_items` WRITE;
/*!40000 ALTER TABLE `asset_builder_items` DISABLE KEYS */;
INSERT INTO `asset_builder_items` VALUES ('2dc06f9d-ef54-11f0-bcb3-18c04d003e97','2dbe6512-ef54-11f0-bcb3-18c04d003e97','c133758c-ecfe-11f0-b486-18c04d003e97','2026-01-12 09:15:27','452bbdf6-0760-4e2b-9175-4dc28ef11bb4'),('2dc075d9-ef54-11f0-bcb3-18c04d003e97','2dbe6512-ef54-11f0-bcb3-18c04d003e97','dc52a652-ecfe-11f0-b486-18c04d003e97','2026-01-12 09:15:27','452bbdf6-0760-4e2b-9175-4dc28ef11bb4'),('2dc077ea-ef54-11f0-bcb3-18c04d003e97','2dbe6512-ef54-11f0-bcb3-18c04d003e97','ae8b18f1-ecfe-11f0-b486-18c04d003e97','2026-01-12 09:15:27','452bbdf6-0760-4e2b-9175-4dc28ef11bb4'),('2dc079a8-ef54-11f0-bcb3-18c04d003e97','2dbe6512-ef54-11f0-bcb3-18c04d003e97','fba1a0ba-ecfe-11f0-b486-18c04d003e97','2026-01-12 09:15:27','452bbdf6-0760-4e2b-9175-4dc28ef11bb4'),('2dc07bbc-ef54-11f0-bcb3-18c04d003e97','2dbe6512-ef54-11f0-bcb3-18c04d003e97','1e824b8a-ecff-11f0-b486-18c04d003e97','2026-01-12 09:15:27','452bbdf6-0760-4e2b-9175-4dc28ef11bb4');
/*!40000 ALTER TABLE `asset_builder_items` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-19  7:18:41
