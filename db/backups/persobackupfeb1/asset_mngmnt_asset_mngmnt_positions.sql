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
-- Table structure for table `asset_mngmnt_positions`
--

DROP TABLE IF EXISTS `asset_mngmnt_positions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_mngmnt_positions` (
  `positionID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `department_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`positionID`),
  KEY `idx_department_id` (`department_id`),
  CONSTRAINT `fk_positions_department` FOREIGN KEY (`department_id`) REFERENCES `asset_mngmnt_departments` (`departmentID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_mngmnt_positions`
--

LOCK TABLES `asset_mngmnt_positions` WRITE;
/*!40000 ALTER TABLE `asset_mngmnt_positions` DISABLE KEYS */;
INSERT INTO `asset_mngmnt_positions` VALUES ('46c683cb-d568-11f0-9510-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','End User Support',NULL,'2025-12-10 09:33:48','65abe729-c369-447e-a864-a8e98b74b842','2025-12-10 09:33:48','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('5091acd2-d568-11f0-9510-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','Jr. Full Stack Developer',NULL,'2025-12-10 09:34:05','65abe729-c369-447e-a864-a8e98b74b842','2025-12-10 09:34:05','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('52c88a3b-f47f-11f0-906b-b42e99f23680','014c6649-cfd8-11f0-9d93-18c04d003e97','Admin Officer',NULL,'2026-01-18 23:06:53','65abe729-c369-447e-a864-a8e98b74b842','2026-01-18 23:06:53','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('6384d7f8-d568-11f0-9510-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','Network Engineer',NULL,'2025-12-10 09:34:37','65abe729-c369-447e-a864-a8e98b74b842','2025-12-10 09:34:37','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('86759993-d568-11f0-9510-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','IT Manager',NULL,'2025-12-10 09:35:35','65abe729-c369-447e-a864-a8e98b74b842','2025-12-10 09:35:35','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL);
/*!40000 ALTER TABLE `asset_mngmnt_positions` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-01 17:10:53
