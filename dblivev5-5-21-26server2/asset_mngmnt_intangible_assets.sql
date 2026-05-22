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
-- Table structure for table `intangible_assets`
--

DROP TABLE IF EXISTS `intangible_assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `intangible_assets` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `company_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `type` enum('IT scope','Admin scope') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'IT scope',
  `status` enum('available','assigned') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_to` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_date` datetime DEFAULT NULL,
  `assignment_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_intangible_assets_company_id` (`company_id`),
  KEY `idx_intangible_assets_type` (`type`),
  KEY `idx_intangible_assets_status` (`status`),
  KEY `idx_intangible_assets_assigned_to` (`assigned_to`),
  KEY `idx_intangible_assets_assignment_id` (`assignment_id`),
  CONSTRAINT `fk_intangible_assets_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`userID`) ON DELETE SET NULL,
  CONSTRAINT `fk_intangible_assets_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`companyID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `intangible_assets`
--

LOCK TABLES `intangible_assets` WRITE;
/*!40000 ALTER TABLE `intangible_assets` DISABLE KEYS */;
INSERT INTO `intangible_assets` VALUES ('38846ddc-54bd-11f1-a44b-00ffff729f5c','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','Github Acc','Email: it.github@theblackcoders.com\nPassword: P@ssw0rdCMTH@2026!','for github accounts','IT scope','assigned','2026-05-21 10:31:49','65abe729-c369-447e-a864-a8e98b74b842','2026-05-21 14:31:02',NULL,'65abe729-c369-447e-a864-a8e98b74b842','2026-05-21 14:31:02','bbfa7b2b-79e5-42e1-a03c-cd6489b27220'),('643dcf4a-54dd-11f1-a44b-00ffff729f5c','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','Figma Account','Ryan','','IT scope','assigned','2026-05-21 14:22:07','65abe729-c369-447e-a864-a8e98b74b842','2026-05-21 14:31:03',NULL,'65abe729-c369-447e-a864-a8e98b74b842','2026-05-21 14:31:03','bbfa7b2b-79e5-42e1-a03c-cd6489b27220'),('92b0dcf4-54c3-11f1-a44b-00ffff729f5c','c3e9c75a-cdbb-11f0-acd5-047c16a24f9f','wix','account','josh','IT scope','assigned','2026-05-21 11:17:18','65abe729-c369-447e-a864-a8e98b74b842','2026-05-21 14:31:02',NULL,'65abe729-c369-447e-a864-a8e98b74b842','2026-05-21 14:31:02','bbfa7b2b-79e5-42e1-a03c-cd6489b27220');
/*!40000 ALTER TABLE `intangible_assets` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-21 22:55:03
