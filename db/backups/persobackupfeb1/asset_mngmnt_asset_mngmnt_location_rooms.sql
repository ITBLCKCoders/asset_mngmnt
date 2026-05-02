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
-- Table structure for table `asset_mngmnt_location_rooms`
--

DROP TABLE IF EXISTS `asset_mngmnt_location_rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_mngmnt_location_rooms` (
  `roomID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `locationID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `room_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`roomID`),
  KEY `fk_location_rooms_location` (`locationID`),
  CONSTRAINT `fk_location_rooms_location` FOREIGN KEY (`locationID`) REFERENCES `asset_mngmnt_locations` (`locationID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_mngmnt_location_rooms`
--

LOCK TABLES `asset_mngmnt_location_rooms` WRITE;
/*!40000 ALTER TABLE `asset_mngmnt_location_rooms` DISABLE KEYS */;
INSERT INTO `asset_mngmnt_location_rooms` VALUES ('7caee4e7-da55-11f0-a44e-18c04d003e97','7ca1d20f-da55-11f0-a44e-18c04d003e97','Stock Room 2','2025-12-16 16:01:54','65abe729-c369-447e-a864-a8e98b74b842','2025-12-16 16:02:13','65abe729-c369-447e-a864-a8e98b74b842','2025-12-16 16:02:13','65abe729-c369-447e-a864-a8e98b74b842'),('7cb0586f-da55-11f0-a44e-18c04d003e97','7ca1d20f-da55-11f0-a44e-18c04d003e97','Stock Room 1','2025-12-16 16:01:54','65abe729-c369-447e-a864-a8e98b74b842','2025-12-16 16:02:13','65abe729-c369-447e-a864-a8e98b74b842','2025-12-16 16:02:13','65abe729-c369-447e-a864-a8e98b74b842'),('87755cc7-cfde-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','Stock Room 1','2025-12-03 08:25:11','65abe729-c369-447e-a864-a8e98b74b842','2025-12-06 14:56:37','65abe729-c369-447e-a864-a8e98b74b842','2025-12-06 14:56:37','65abe729-c369-447e-a864-a8e98b74b842'),('87775c01-cfde-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','Stock Room 2','2025-12-03 08:25:11','65abe729-c369-447e-a864-a8e98b74b842','2025-12-06 14:56:37','65abe729-c369-447e-a864-a8e98b74b842','2025-12-06 14:56:37','65abe729-c369-447e-a864-a8e98b74b842'),('883f41b8-da55-11f0-a44e-18c04d003e97','7ca1d20f-da55-11f0-a44e-18c04d003e97','Stock Room 1','2025-12-16 16:02:14','65abe729-c369-447e-a864-a8e98b74b842','2025-12-16 16:02:14','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('88417964-da55-11f0-a44e-18c04d003e97','7ca1d20f-da55-11f0-a44e-18c04d003e97','Stock Room 2','2025-12-16 16:02:14','65abe729-c369-447e-a864-a8e98b74b842','2025-12-16 16:02:14','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('a2cadf72-da55-11f0-a44e-18c04d003e97','a2c8d286-da55-11f0-a44e-18c04d003e97','Mike\'s Workspace','2025-12-16 16:02:58','65abe729-c369-447e-a864-a8e98b74b842','2025-12-16 16:02:58','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('b5fa4121-d270-11f0-8e80-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','Stock Room 2','2025-12-06 14:56:37','65abe729-c369-447e-a864-a8e98b74b842','2025-12-06 14:56:37','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('b5fa87c3-d270-11f0-8e80-047c16a24f9f','87736191-cfde-11f0-9d93-18c04d003e97','Stock Room 1','2025-12-06 14:56:37','65abe729-c369-447e-a864-a8e98b74b842','2025-12-06 14:56:37','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL);
/*!40000 ALTER TABLE `asset_mngmnt_location_rooms` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-01 17:10:54
