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
-- Table structure for table `asset_mngmnt_locations`
--

DROP TABLE IF EXISTS `asset_mngmnt_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_mngmnt_locations` (
  `locationID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `company_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `floor_unit` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `building` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `room_area` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`locationID`),
  KEY `idx_company_id` (`company_id`),
  KEY `fk_locations_department` (`department_id`),
  CONSTRAINT `fk_locations_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`companyID`) ON DELETE CASCADE,
  CONSTRAINT `fk_locations_department` FOREIGN KEY (`department_id`) REFERENCES `asset_mngmnt_departments` (`departmentID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_mngmnt_locations`
--

LOCK TABLES `asset_mngmnt_locations` WRITE;
/*!40000 ALTER TABLE `asset_mngmnt_locations` DISABLE KEYS */;
INSERT INTO `asset_mngmnt_locations` VALUES ('613f323f-f4df-11f0-9f53-18c04d003e97','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','Admin Office','1803','Antel Global Corporate Center','014c6649-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'2026-01-19 10:34:29','65abe729-c369-447e-a864-a8e98b74b842','2026-01-19 10:34:29','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('70cbcf39-f4df-11f0-9f53-18c04d003e97','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','HR Office','!803','Antel Global Corporate Center','12507366-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'2026-01-19 10:34:55','65abe729-c369-447e-a864-a8e98b74b842','2026-01-19 10:34:55','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('7ca1d20f-da55-11f0-a44e-18c04d003e97','52c8583a-cdbc-11f0-acd5-047c16a24f9f','IT Office','Unit 1908','Antel Global Corporate Center','84383ebf-da55-11f0-a44e-18c04d003e97',NULL,'For new Assets','2025-12-16 16:01:54','65abe729-c369-447e-a864-a8e98b74b842','2025-12-16 16:02:13','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('807229fe-f4df-11f0-9f53-18c04d003e97','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','FInance Office','1803','Antel Global Corporate Center','f7a164ee-cfd7-11f0-9d93-18c04d003e97',NULL,NULL,'2026-01-19 10:35:21','65abe729-c369-447e-a864-a8e98b74b842','2026-01-19 10:35:21','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('87736191-cfde-11f0-9d93-18c04d003e97','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','IT Office','Unit 1908','Antel Global Corporate Center','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,'For new Assets','2025-12-03 08:25:11','65abe729-c369-447e-a864-a8e98b74b842','2026-01-19 10:33:30','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('a2c8d286-da55-11f0-a44e-18c04d003e97','52c8583a-cdbc-11f0-acd5-047c16a24f9f','BCGI','803','Antel Global','84383ebf-da55-11f0-a44e-18c04d003e97',NULL,'FUCK U','2025-12-16 16:02:58','65abe729-c369-447e-a864-a8e98b74b842','2025-12-16 16:02:58','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('af3a1d62-00a6-11f1-a629-b8cb29c59adf','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','Marketing Office','Unit 1803','Antel Global Corporate Center','1e901f22-cfd8-11f0-9d93-18c04d003e97',NULL,NULL,'2026-02-03 10:18:52','65abe729-c369-447e-a864-a8e98b74b842','2026-02-03 10:18:52','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('b327afcc-00c0-11f1-a629-b8cb29c59adf','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','Group Buisness Director Office','1803','Antel Global Corporate Center',NULL,NULL,NULL,'2026-02-03 13:25:06','65abe729-c369-447e-a864-a8e98b74b842','2026-02-03 13:25:06','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('e7eb915f-00ad-11f1-a629-b8cb29c59adf','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','Legal','1803','Antel Global Corporate Center','ec1eb111-cfd6-11f0-9d93-18c04d003e97',NULL,NULL,'2026-02-03 11:10:34','65abe729-c369-447e-a864-a8e98b74b842','2026-02-03 11:10:34','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL);
/*!40000 ALTER TABLE `asset_mngmnt_locations` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-03 21:11:17
