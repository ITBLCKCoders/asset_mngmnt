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
INSERT INTO `asset_builders` VALUES ('136cdf88-4f37-11f1-978d-00ffff729f5c','Dell Laptop','Rex 6MT5C73','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-14 09:48:59','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 09:50:19','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('166e1823-4f3e-11f1-978d-00ffff729f5c','Dell laptop','liza','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-14 10:39:10','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 10:41:37','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('198a2e66-4f36-11f1-978d-00ffff729f5c','Lenovo Laptop','Marga PF4G9RHP','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-14 09:42:00','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 09:43:31','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('1a867ba4-524d-11f1-a44b-00ffff729f5c','Dell Inspiron','Ellen','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-18 08:04:13','65abe729-c369-447e-a864-a8e98b74b842','2026-05-18 08:07:38','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('1c5311b0-5420-11f1-8cc2-b8cb29c59adf','Desktop','Nea\'s Desktop\nBCGI-ITOFE-DESKPC-OU-00016','Available','21a225aa-cdbc-11f0-acd5-047c16a24f9f','2026-05-20 15:47:11','476e06e6-2f5f-46d0-8292-5fde561a37b4','2026-05-21 09:08:33','476e06e6-2f5f-46d0-8292-5fde561a37b4',NULL,NULL),('21b9ff6c-54f3-11f1-8cc2-b8cb29c59adf','ASUS TUF Gaming F15 Laptop','ASUS TUF Gaming F15 Laptop\nGrace','Available','21a225aa-cdbc-11f0-acd5-047c16a24f9f','2026-05-21 16:57:44','476e06e6-2f5f-46d0-8292-5fde561a37b4','2026-05-21 16:57:44','476e06e6-2f5f-46d0-8292-5fde561a37b4',NULL,NULL),('2ae8e45b-49fd-11f1-b1fa-00ffff729f5c','Lenovo Laptop 1','jb temp PF5XC0M1','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-07 18:11:52','65abe729-c369-447e-a864-a8e98b74b842','2026-05-18 08:09:33','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('2fe232ed-54a6-11f1-8cc2-b8cb29c59adf','Desktop 2','Desktop 2\nMichael','Available','21a225aa-cdbc-11f0-acd5-047c16a24f9f','2026-05-21 07:46:56','476e06e6-2f5f-46d0-8292-5fde561a37b4','2026-05-21 14:05:41','476e06e6-2f5f-46d0-8292-5fde561a37b4',NULL,NULL),('32459972-49f2-11f1-b1fa-00ffff729f5c','Dell 15 laptop 4','Steph B1Z3GC4','Assigned','21a225aa-cdbc-11f0-acd5-047c16a24f9f','2026-05-07 16:53:19','65abe729-c369-447e-a864-a8e98b74b842','2026-05-20 14:00:48','476e06e6-2f5f-46d0-8292-5fde561a37b4',NULL,NULL),('38b73d1e-5251-11f1-a44b-00ffff729f5c','Lenovo Legion','Ralph','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-18 08:33:42','65abe729-c369-447e-a864-a8e98b74b842','2026-05-18 08:39:09','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('3ee5a7a7-524d-11f1-a44b-00ffff729f5c','Lenovo Ideapad 5','ellen','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-18 08:05:14','65abe729-c369-447e-a864-a8e98b74b842','2026-05-18 08:07:38','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('4446b518-49dc-11f1-b1fa-00ffff729f5c','Dell 15 laptop 1','Mitch, H1Z3GC4','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-07 14:16:21','65abe729-c369-447e-a864-a8e98b74b842','2026-05-18 09:14:56','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('62465d50-5264-11f1-a44b-00ffff729f5c','Lenovo Thinkpad','Allysa old marketing','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-18 10:50:52','65abe729-c369-447e-a864-a8e98b74b842','2026-05-18 11:11:57','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('633d27b7-4f3a-11f1-978d-00ffff729f5c','Dell Laptop','Tanya','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-14 10:12:41','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 10:14:27','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('65c33d06-53f2-11f1-8cc2-b8cb29c59adf','Dell inspiron 3480','Michael - 1TFF1W2 \nDell inspiron 3480','Available','21a225aa-cdbc-11f0-acd5-047c16a24f9f','2026-05-20 10:19:57','476e06e6-2f5f-46d0-8292-5fde561a37b4','2026-05-21 13:50:29','476e06e6-2f5f-46d0-8292-5fde561a37b4',NULL,NULL),('66f3cfeb-49c3-11f1-b1fa-00ffff729f5c','Dell 16 Laptop 1','Tere','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-07 11:18:21','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 07:31:53','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('67459d6d-4f35-11f1-978d-00ffff729f5c','Lenovo Laptop','Julius PW00NEDF','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-14 09:37:00','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 09:38:11','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('6901e44d-5259-11f1-a44b-00ffff729f5c','HR PC DESKTOP','angel','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-18 09:32:19','65abe729-c369-447e-a864-a8e98b74b842','2026-05-18 09:34:13','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('6d4300e1-4ccf-11f1-9e32-00ffff729f5c','Lenovo Laptop','Law PF4FYE89','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-11 08:22:00','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 07:35:07','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('766ae8c4-5254-11f1-a44b-00ffff729f5c','Marketing Desktop PC','terry','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-18 08:56:54','65abe729-c369-447e-a864-a8e98b74b842','2026-05-18 08:59:11','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('7a6f6d3e-4f34-11f1-978d-00ffff729f5c','AIO PC','Zyra','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-14 09:30:23','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 09:32:10','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('7caa9450-49d0-11f1-b1fa-00ffff729f5c','Dell 16 Laptop 2','Marlon 8DK0MD4','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-07 12:52:01','65abe729-c369-447e-a864-a8e98b74b842','2026-05-18 09:47:25','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('7f2abaa7-5263-11f1-a44b-00ffff729f5c','Lenovo Laptop','Mariah','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-18 10:44:31','65abe729-c369-447e-a864-a8e98b74b842','2026-05-18 10:45:39','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('7f4ad835-49da-11f1-b1fa-00ffff729f5c','Lenovo Ideapad Slim 3i 1','Armie, PF5YPT0G','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-07 14:03:41','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 07:39:55','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('857390df-49f1-11f1-b1fa-00ffff729f5c','Dell 15 laptop 3','Eloisa 1M53GC4','Available','52c8583a-cdbc-11f0-acd5-047c16a24f9f','2026-05-07 16:48:30','65abe729-c369-447e-a864-a8e98b74b842','2026-05-18 10:53:37','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('8a830362-49d8-11f1-b1fa-00ffff729f5c','Acer Aspire Laptop','Lorie, NXD34SP002537010959F00','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-07 13:49:41','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 07:41:23','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('9dbec04d-5257-11f1-a44b-00ffff729f5c','Desktop PC Admin2','anne','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-18 09:19:28','65abe729-c369-447e-a864-a8e98b74b842','2026-05-18 09:22:30','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('ab8fc280-4ccf-11f1-9e32-00ffff729f5c','Lenovo LOQ','Rey MP2RY8JY','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-11 08:23:44','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 07:46:45','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('ad312338-525a-11f1-a44b-00ffff729f5c','Marketing Desktop PC 2','jm','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-18 09:41:23','65abe729-c369-447e-a864-a8e98b74b842','2026-05-18 09:43:55','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('b7608846-49f0-11f1-b1fa-00ffff729f5c','Dell 15 laptop 2','Marieanne 1T53GC4','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-07 16:42:44','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 07:44:31','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('bf59d333-5252-11f1-a44b-00ffff729f5c','Desktop PC Admin','gladys','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-18 08:44:37','65abe729-c369-447e-a864-a8e98b74b842','2026-05-18 09:16:56','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('c067b2d2-54de-11f1-8cc2-b8cb29c59adf','Dell Inspiron Laptop','Dell Inspiron Laptop\nJay','Assigned','21a225aa-cdbc-11f0-acd5-047c16a24f9f','2026-05-21 14:31:51','476e06e6-2f5f-46d0-8292-5fde561a37b4','2026-05-21 14:37:33','476e06e6-2f5f-46d0-8292-5fde561a37b4',NULL,NULL),('cf00391a-49e2-11f1-b1fa-00ffff729f5c','Lenovo Ideapad','Levie, PF5RRVKM','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-07 15:03:10','65abe729-c369-447e-a864-a8e98b74b842','2026-05-14 07:37:20','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('d3c5e358-53f7-11f1-8cc2-b8cb29c59adf','ThinkBook 14 G7 IML','Joshua - PW0G8CTM\nThinkBook 14 G7 IML','Available','21a225aa-cdbc-11f0-acd5-047c16a24f9f','2026-05-20 10:58:50','476e06e6-2f5f-46d0-8292-5fde561a37b4','2026-05-21 13:49:21','476e06e6-2f5f-46d0-8292-5fde561a37b4',NULL,NULL),('d70436ad-49fe-11f1-b1fa-00ffff729f5c','Lenovo Laptop 2','jb PF5XCGSD','Assigned','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','2026-05-07 18:23:50','65abe729-c369-447e-a864-a8e98b74b842','2026-05-18 08:09:33','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('e01b9282-49e7-11f1-b1fa-00ffff729f5c','Dell 16 Laptop 3','Ryan BCGI GJMOMD4','Assigned','21a225aa-cdbc-11f0-acd5-047c16a24f9f','2026-05-07 15:39:27','65abe729-c369-447e-a864-a8e98b74b842','2026-05-20 07:54:58','476e06e6-2f5f-46d0-8292-5fde561a37b4',NULL,NULL);
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

-- Dump completed on 2026-05-21 17:16:14
