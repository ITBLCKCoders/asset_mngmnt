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
INSERT INTO `asset_builder_items` VALUES ('4372190c-3f3e-11f1-a473-00ffff729f5c','032b8b72-3f3d-11f1-a473-00ffff729f5c','ebfb15d7-3f3c-11f1-a473-00ffff729f5c','2026-04-24 02:00:07','38b6ecb2-4f95-4307-bc90-9d2f54d2c133'),('43721e0d-3f3e-11f1-a473-00ffff729f5c','032b8b72-3f3d-11f1-a473-00ffff729f5c','c4209f36-3f24-11f1-a473-00ffff729f5c','2026-04-24 02:00:07','38b6ecb2-4f95-4307-bc90-9d2f54d2c133'),('6b9ff1ad-3f3d-11f1-a473-00ffff729f5c','6b9f6506-3f3d-11f1-a473-00ffff729f5c','94b9e213-3f1f-11f1-a473-00ffff729f5c','2026-04-24 01:54:05','38b6ecb2-4f95-4307-bc90-9d2f54d2c133'),('6b9ff62e-3f3d-11f1-a473-00ffff729f5c','6b9f6506-3f3d-11f1-a473-00ffff729f5c','5f18c2fb-3f1f-11f1-a473-00ffff729f5c','2026-04-24 01:54:05','38b6ecb2-4f95-4307-bc90-9d2f54d2c133'),('72b8c80e-404b-11f1-bb64-00ffff729f5c','72b81e67-404b-11f1-bb64-00ffff729f5c','889593b6-3f8f-11f1-a473-00ffff729f5c','2026-04-25 10:07:01','65abe729-c369-447e-a864-a8e98b74b842'),('72b8dd82-404b-11f1-bb64-00ffff729f5c','72b81e67-404b-11f1-bb64-00ffff729f5c','ac35f4df-3f8f-11f1-a473-00ffff729f5c','2026-04-25 10:07:01','65abe729-c369-447e-a864-a8e98b74b842'),('72b8e855-404b-11f1-bb64-00ffff729f5c','72b81e67-404b-11f1-bb64-00ffff729f5c','62468edd-404b-11f1-bb64-00ffff729f5c','2026-04-25 10:07:01','65abe729-c369-447e-a864-a8e98b74b842'),('e829ea2c-3ff9-11f1-bb64-00ffff729f5c','e82953f7-3ff9-11f1-bb64-00ffff729f5c','2268fe24-3f8d-11f1-a473-00ffff729f5c','2026-04-25 00:23:19','38b6ecb2-4f95-4307-bc90-9d2f54d2c133'),('e829fd26-3ff9-11f1-bb64-00ffff729f5c','e82953f7-3ff9-11f1-bb64-00ffff729f5c','e2c2fb8e-3ff9-11f1-bb64-00ffff729f5c','2026-04-25 00:23:19','38b6ecb2-4f95-4307-bc90-9d2f54d2c133');
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

-- Dump completed on 2026-04-27  8:56:25
