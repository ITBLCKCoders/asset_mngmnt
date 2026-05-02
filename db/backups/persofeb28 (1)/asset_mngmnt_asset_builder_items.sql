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
INSERT INTO `asset_builder_items` VALUES ('03e26a4e-114b-11f1-97a8-b8cb29c59adf','03e22715-114b-11f1-97a8-b8cb29c59adf','fa4e087d-019d-11f1-a629-b8cb29c59adf','2026-02-24 14:35:31','7fa0df8c-3861-4f63-ba16-1806425afea0'),('03e26d58-114b-11f1-97a8-b8cb29c59adf','03e22715-114b-11f1-97a8-b8cb29c59adf','805d6c54-019d-11f1-a629-b8cb29c59adf','2026-02-24 14:35:31','7fa0df8c-3861-4f63-ba16-1806425afea0'),('03e26e8e-114b-11f1-97a8-b8cb29c59adf','03e22715-114b-11f1-97a8-b8cb29c59adf','a042bb29-019d-11f1-a629-b8cb29c59adf','2026-02-24 14:35:31','7fa0df8c-3861-4f63-ba16-1806425afea0'),('03e26fa5-114b-11f1-97a8-b8cb29c59adf','03e22715-114b-11f1-97a8-b8cb29c59adf','ca102599-019d-11f1-a629-b8cb29c59adf','2026-02-24 14:35:31','7fa0df8c-3861-4f63-ba16-1806425afea0'),('3730101b-114b-11f1-97a8-b8cb29c59adf','372f91df-114b-11f1-97a8-b8cb29c59adf','771e8733-018f-11f1-a629-b8cb29c59adf','2026-02-24 14:36:57','7fa0df8c-3861-4f63-ba16-1806425afea0'),('373013f9-114b-11f1-97a8-b8cb29c59adf','372f91df-114b-11f1-97a8-b8cb29c59adf','566b7610-0190-11f1-a629-b8cb29c59adf','2026-02-24 14:36:57','7fa0df8c-3861-4f63-ba16-1806425afea0'),('373015d3-114b-11f1-97a8-b8cb29c59adf','372f91df-114b-11f1-97a8-b8cb29c59adf','dcfe4392-018f-11f1-a629-b8cb29c59adf','2026-02-24 14:36:57','7fa0df8c-3861-4f63-ba16-1806425afea0'),('373017b0-114b-11f1-97a8-b8cb29c59adf','372f91df-114b-11f1-97a8-b8cb29c59adf','23f863b6-0190-11f1-a629-b8cb29c59adf','2026-02-24 14:36:57','7fa0df8c-3861-4f63-ba16-1806425afea0'),('3730196c-114b-11f1-97a8-b8cb29c59adf','372f91df-114b-11f1-97a8-b8cb29c59adf','6bcf0f53-0190-11f1-a629-b8cb29c59adf','2026-02-24 14:36:57','7fa0df8c-3861-4f63-ba16-1806425afea0'),('5ab7358d-114f-11f1-97a8-b8cb29c59adf','5ab6fbc1-114f-11f1-97a8-b8cb29c59adf','ad9ded3a-00ca-11f1-a629-b8cb29c59adf','2026-02-24 15:06:34','7fa0df8c-3861-4f63-ba16-1806425afea0'),('5ab738b8-114f-11f1-97a8-b8cb29c59adf','5ab6fbc1-114f-11f1-97a8-b8cb29c59adf','fec1e63c-00ca-11f1-a629-b8cb29c59adf','2026-02-24 15:06:34','7fa0df8c-3861-4f63-ba16-1806425afea0'),('5ab73a14-114f-11f1-97a8-b8cb29c59adf','5ab6fbc1-114f-11f1-97a8-b8cb29c59adf','4fe78763-00cb-11f1-a629-b8cb29c59adf','2026-02-24 15:06:34','7fa0df8c-3861-4f63-ba16-1806425afea0'),('7f095197-114b-11f1-97a8-b8cb29c59adf','7f08cb79-114b-11f1-97a8-b8cb29c59adf','4c86f75a-00a9-11f1-a629-b8cb29c59adf','2026-02-24 14:38:57','7fa0df8c-3861-4f63-ba16-1806425afea0'),('7f09557f-114b-11f1-97a8-b8cb29c59adf','7f08cb79-114b-11f1-97a8-b8cb29c59adf','fa410271-00aa-11f1-a629-b8cb29c59adf','2026-02-24 14:38:57','7fa0df8c-3861-4f63-ba16-1806425afea0'),('7f09576a-114b-11f1-97a8-b8cb29c59adf','7f08cb79-114b-11f1-97a8-b8cb29c59adf','cbef789c-00a7-11f1-a629-b8cb29c59adf','2026-02-24 14:38:57','7fa0df8c-3861-4f63-ba16-1806425afea0'),('7f095921-114b-11f1-97a8-b8cb29c59adf','7f08cb79-114b-11f1-97a8-b8cb29c59adf','d1e16715-00a8-11f1-a629-b8cb29c59adf','2026-02-24 14:38:57','7fa0df8c-3861-4f63-ba16-1806425afea0'),('7f095ab2-114b-11f1-97a8-b8cb29c59adf','7f08cb79-114b-11f1-97a8-b8cb29c59adf','13f4afd4-00ab-11f1-a629-b8cb29c59adf','2026-02-24 14:38:57','7fa0df8c-3861-4f63-ba16-1806425afea0'),('7f095c6e-114b-11f1-97a8-b8cb29c59adf','7f08cb79-114b-11f1-97a8-b8cb29c59adf','4dbdd563-00ab-11f1-a629-b8cb29c59adf','2026-02-24 14:38:57','7fa0df8c-3861-4f63-ba16-1806425afea0'),('bc57178e-114a-11f1-97a8-b8cb29c59adf','bc56a9c2-114a-11f1-97a8-b8cb29c59adf','f29d4691-0574-11f1-a629-b8cb29c59adf','2026-02-24 14:33:31','7fa0df8c-3861-4f63-ba16-1806425afea0'),('bc571bd4-114a-11f1-97a8-b8cb29c59adf','bc56a9c2-114a-11f1-97a8-b8cb29c59adf','5ea71a99-0574-11f1-a629-b8cb29c59adf','2026-02-24 14:33:31','7fa0df8c-3861-4f63-ba16-1806425afea0'),('bc571d53-114a-11f1-97a8-b8cb29c59adf','bc56a9c2-114a-11f1-97a8-b8cb29c59adf','87035019-0574-11f1-a629-b8cb29c59adf','2026-02-24 14:33:31','7fa0df8c-3861-4f63-ba16-1806425afea0'),('bc571e74-114a-11f1-97a8-b8cb29c59adf','bc56a9c2-114a-11f1-97a8-b8cb29c59adf','acabf8b7-0574-11f1-a629-b8cb29c59adf','2026-02-24 14:33:31','7fa0df8c-3861-4f63-ba16-1806425afea0'),('bc571f93-114a-11f1-97a8-b8cb29c59adf','bc56a9c2-114a-11f1-97a8-b8cb29c59adf','cf57fc21-0574-11f1-a629-b8cb29c59adf','2026-02-24 14:33:31','7fa0df8c-3861-4f63-ba16-1806425afea0');
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

-- Dump completed on 2026-02-28 22:48:58
