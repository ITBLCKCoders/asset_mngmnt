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
-- Table structure for table `user_address`
--

DROP TABLE IF EXISTS `user_address`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_address` (
  `addressID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `userID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `building_house_no` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `street` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subdivision` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `barangay` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `province` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `region` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_permanent` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`addressID`),
  UNIQUE KEY `unique_permanent_address` (`userID`,`is_permanent`),
  UNIQUE KEY `uniq_permanent_addr` (`userID`,`is_permanent`),
  UNIQUE KEY `uniq_permanent_address` (`userID`,`is_permanent`),
  CONSTRAINT `user_address_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `users` (`userID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_address`
--

LOCK TABLES `user_address` WRITE;
/*!40000 ALTER TABLE `user_address` DISABLE KEYS */;
INSERT INTO `user_address` VALUES ('2c2a40db-1eaf-11f1-97a8-b8cb29c59adf','67532522-4735-4426-bec3-5786e944a7c5',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-03-13 15:35:13','2026-03-13 15:35:13'),('523a4f54-3f48-11f1-a473-00ffff729f5c','86caed5e-b6f8-442a-8423-168d9ad4a579',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-04-24 03:12:07','2026-04-25 10:17:16'),('6a9523e4-f501-11f0-a629-b8cb29c59adf','3196d5d4-9966-410d-bb80-76a582659c45','2803','Amaia Skies','Shaw Blvd.',NULL,'Highway Hills','Mandaluyong City','Metro Manila','NCR',1,'2026-01-19 14:38:08','2026-01-19 14:38:08'),('6d889acc-3fe3-11f1-b309-00ffff729f5c','49f7dc35-6531-4041-b140-e5d84c26b40f',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-04-24 21:42:25','2026-04-24 21:42:25'),('866bab6c-3f4b-11f1-a473-00ffff729f5c','38b6ecb2-4f95-4307-bc90-9d2f54d2c133',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-04-24 03:35:03','2026-04-30 07:33:50'),('b3dc0b5d-00a0-11f1-a629-b8cb29c59adf','7fa0df8c-3861-4f63-ba16-1806425afea0',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-02-03 09:36:03','2026-02-27 13:18:25'),('b4a2ebbb-1ead-11f1-97a8-b8cb29c59adf','90a1439a-0d3d-4eee-8a4d-b40d9e0755f7',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-03-13 15:24:43','2026-03-13 15:24:43'),('b9868d3d-f502-11f0-a629-b8cb29c59adf','88fd2aec-2c25-476a-a41f-0d4c0a457c38',NULL,'#3','ISAAC ','SAN DIEGO','MALANDAY','MARIKINA ',NULL,'NCR',1,'2026-01-19 14:47:29','2026-01-19 14:47:29'),('c738e2de-5415-11f1-8cc2-b8cb29c59adf','476e06e6-2f5f-46d0-8292-5fde561a37b4',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-05-20 14:33:13','2026-05-20 14:33:13'),('c94956a7-f502-11f0-a629-b8cb29c59adf','63136f4e-44a7-45c7-8eab-3f2185315dc8',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-01-19 14:47:56','2026-01-19 14:47:56'),('e5da5a35-53db-11f1-a44b-00ffff729f5c','92dbe68d-b9da-417f-9856-08e8f41a8843',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-05-20 07:38:54','2026-05-20 07:38:54'),('f434f4c4-cdc4-11f0-acd5-047c16a24f9f','65abe729-c369-447e-a864-a8e98b74b842','UNit 908','antel global ','13231 st pasig','wedaswq','barnahg','gdhjasghjdg','hgdhajhjd','ghhajgsd',1,'2025-11-30 16:17:04','2026-05-21 21:29:45');
/*!40000 ALTER TABLE `user_address` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-21 22:55:05
