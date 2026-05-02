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
-- Table structure for table `asset_transfer`
--

DROP TABLE IF EXISTS `asset_transfer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_transfer` (
  `record_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `form_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `assignment_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `transfer_condition` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transfer_notes` text COLLATE utf8mb4_unicode_ci,
  `condition_images` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`record_id`),
  KEY `idx_asset_transfer_form_id` (`form_id`),
  KEY `idx_asset_transfer_assignment_id` (`assignment_id`),
  KEY `fk_asset_transfer_user_id` (`user_id`),
  CONSTRAINT `fk_asset_transfer_assignment_id` FOREIGN KEY (`assignment_id`) REFERENCES `asset_assignments` (`assignmentID`) ON DELETE CASCADE,
  CONSTRAINT `fk_asset_transfer_form_id` FOREIGN KEY (`form_id`) REFERENCES `asset_transfer_forms` (`formID`) ON DELETE CASCADE,
  CONSTRAINT `fk_asset_transfer_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`userID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_transfer`
--

LOCK TABLES `asset_transfer` WRITE;
/*!40000 ALTER TABLE `asset_transfer` DISABLE KEYS */;
INSERT INTO `asset_transfer` VALUES ('0024f386-f46e-440e-acad-8c2d230d9b4f','3660e594-cd87-43fd-9641-68bb773a95d0','850e7797-4c63-4af1-93b4-a193cbfdef5b','65abe729-c369-447e-a864-a8e98b74b842','Good','',NULL,'2026-02-22 10:39:18',NULL),('0b19351f-4248-43d7-875a-03a92bb2033e','3e3ed9e5-1826-461c-bcdd-a4d824366aa4','8333049f-d913-4b32-96d9-884179f17e2f','65abe729-c369-447e-a864-a8e98b74b842','Fair','',NULL,'2026-02-22 17:26:44',NULL),('1962a648-bb88-409f-a36d-d8dd792bd861','55249628-a863-476f-95d0-6ddab8846226','37666210-336d-42dd-8ef3-f27f6e7d5c98','c68d1fe0-2010-43a3-bd2c-b5c6cf01384a','Good','',NULL,'2026-02-22 17:44:26',NULL),('419fd632-5a08-4335-86cb-260889b4aa41','3660e594-cd87-43fd-9641-68bb773a95d0','dc7dc272-2927-4c7e-84d5-2222eabaea52','65abe729-c369-447e-a864-a8e98b74b842','Good','',NULL,'2026-02-22 10:39:18',NULL),('635136d9-f808-4108-af73-43e2343f338f','6b58af90-66e3-4831-9c04-af70434c3d6b','3bf5751a-7fe3-472f-93cf-60c309b2190f','c68d1fe0-2010-43a3-bd2c-b5c6cf01384a','Good','',NULL,'2026-02-22 16:55:53',NULL),('80846b35-c3ed-4162-8efd-a99eef7e2bd1','6b58af90-66e3-4831-9c04-af70434c3d6b','151e5a15-2318-4555-abed-c6a9a7c6662c','c68d1fe0-2010-43a3-bd2c-b5c6cf01384a','Good','',NULL,'2026-02-22 16:55:53',NULL),('b93bd61c-cf6b-4639-a521-8cb233d954ed','4cbf8ad9-f189-47bf-b599-9e1f8594b4f7','76b90129-34e2-4b7d-967b-74a990ba60f1','c68d1fe0-2010-43a3-bd2c-b5c6cf01384a','Good','',NULL,'2026-02-22 10:46:58',NULL),('d3cbbc19-5e7f-4a93-9634-b9b0e9466268','55249628-a863-476f-95d0-6ddab8846226','c2091efc-c2f1-45f5-998f-685a07a4463c','c68d1fe0-2010-43a3-bd2c-b5c6cf01384a','Good','',NULL,'2026-02-22 17:44:26',NULL),('dafc0055-4456-4c65-821e-78bf9b0d995b','4efe6589-af24-447a-8cd4-28a2cb258bc7','3e169cf4-ec05-4519-978e-129303198554','c68d1fe0-2010-43a3-bd2c-b5c6cf01384a','Good','',NULL,'2026-02-22 17:39:41',NULL),('df73281b-c8c3-4e52-992d-2c7729e12b7c','3e3ed9e5-1826-461c-bcdd-a4d824366aa4','0c954909-e2c4-4c4d-8ed6-f7855e5b62e9','65abe729-c369-447e-a864-a8e98b74b842','Fair','',NULL,'2026-02-22 17:26:44',NULL),('e5fb39ea-ef34-4fb8-93c5-dec324e7a5e5','4efe6589-af24-447a-8cd4-28a2cb258bc7','f73b40a1-5a4f-4a49-a680-dbb609842538','c68d1fe0-2010-43a3-bd2c-b5c6cf01384a','Good','',NULL,'2026-02-22 17:39:41',NULL),('f887cdc7-84a1-42fc-ac8e-b655fcbacb15','5e19ed4f-2e71-4fe6-a57c-74bb3cddb5a6','c03a282e-3650-428f-a150-a83e15392f5d','c68d1fe0-2010-43a3-bd2c-b5c6cf01384a','Good','',NULL,'2026-02-22 10:54:35',NULL);
/*!40000 ALTER TABLE `asset_transfer` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-28 16:14:39
