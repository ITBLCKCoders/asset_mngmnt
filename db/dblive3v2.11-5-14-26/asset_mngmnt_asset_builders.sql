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
INSERT INTO `asset_builders` VALUES ('1fa33eca-4f2c-11f1-978d-00ffff729f5c','Lenovo Laptop','JuliusPW00NEDF','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-14 08:30:35','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 08:32:13','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('2ae8e45b-49fd-11f1-b1fa-00ffff729f5c','Lenovo Laptop 1','jb temp PF5XC0M1','Available','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-07 18:11:52','65abe729-c369-447e-a864-a8e98b74b842','2026-05-11 08:01:51','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('32459972-49f2-11f1-b1fa-00ffff729f5c','Dell 15 laptop 4','Steph B1Z3GC4','Available','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-07 16:53:19','65abe729-c369-447e-a864-a8e98b74b842','2026-05-07 16:53:19','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('4446b518-49dc-11f1-b1fa-00ffff729f5c','Dell 15 laptop 1','Mitch, H1Z3GC4','Available','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-07 14:16:21','65abe729-c369-447e-a864-a8e98b74b842','2026-05-07 14:16:21','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('66f3cfeb-49c3-11f1-b1fa-00ffff729f5c','Dell 16 Laptop 1','Tere','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-07 11:18:21','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 07:31:53','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('6d4300e1-4ccf-11f1-9e32-00ffff729f5c','Lenovo Laptop','Law PF4FYE89','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-11 08:22:00','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 07:35:07','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('7caa9450-49d0-11f1-b1fa-00ffff729f5c','Dell 16 Laptop 2','Marlon 8DK0MD4','Available','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-07 12:52:01','65abe729-c369-447e-a864-a8e98b74b842','2026-05-07 12:52:01','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('7f4ad835-49da-11f1-b1fa-00ffff729f5c','Lenovo Ideapad Slim 3i 1','Armie, PF5YPT0G','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-07 14:03:41','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 07:39:55','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('857390df-49f1-11f1-b1fa-00ffff729f5c','Dell 15 laptop 3','Eloisa 1M53GC4','Available','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-07 16:48:30','65abe729-c369-447e-a864-a8e98b74b842','2026-05-07 16:48:30','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('86e5bf2e-4f2c-11f1-978d-00ffff729f5c','AIO PC','ZYRA','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-14 08:33:28','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 08:35:17','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('8a830362-49d8-11f1-b1fa-00ffff729f5c','Acer Aspire Laptop','Lorie, NXD34SP002537010959F00','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-07 13:49:41','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 07:41:23','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('8c6d7a06-4f2a-11f1-978d-00ffff729f5c','Lenovo Laptop','Marga PF4G9RHP','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-14 08:19:18','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 08:22:17','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('ab8fc280-4ccf-11f1-9e32-00ffff729f5c','Lenovo LOQ','Rey MP2RY8JY','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-11 08:23:44','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 07:46:45','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('b7608846-49f0-11f1-b1fa-00ffff729f5c','Dell 15 laptop 2','Marieanne 1T53GC4','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-07 16:42:44','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 07:44:31','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('c9ad7380-4f2d-11f1-978d-00ffff729f5c','Dell Laptop','Rex 6MT5C73','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-14 08:42:30','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 08:43:45','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('cf00391a-49e2-11f1-b1fa-00ffff729f5c','Lenovo Ideapad','Levie, PF5RRVKM','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-07 15:03:10','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 07:37:20','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('d70436ad-49fe-11f1-b1fa-00ffff729f5c','Lenovo Laptop 2','jb PF5XCGSD','Available','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-07 18:23:50','65abe729-c369-447e-a864-a8e98b74b842','2026-05-11 08:01:59','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('e01b9282-49e7-11f1-b1fa-00ffff729f5c','Dell 16 Laptop 3','Ryan BCGI GJMOMD4','Available','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-07 15:39:27','65abe729-c369-447e-a864-a8e98b74b842','2026-05-07 15:39:27','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL);
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

-- Dump completed on 2026-05-14  9:21:07
