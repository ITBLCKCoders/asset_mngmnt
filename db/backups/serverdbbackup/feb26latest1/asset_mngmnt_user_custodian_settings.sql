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
-- Table structure for table `user_custodian_settings`
--

DROP TABLE IF EXISTS `user_custodian_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_custodian_settings` (
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `access_add_edit` tinyint NOT NULL DEFAULT '0',
  `access_assignment` tinyint NOT NULL DEFAULT '0',
  `access_return` tinyint NOT NULL DEFAULT '0',
  `hr_accountability_receiver` tinyint NOT NULL DEFAULT '0',
  `manager_approver_1` tinyint NOT NULL DEFAULT '0',
  `manager_approver_2` tinyint NOT NULL DEFAULT '0',
  `manager_approver_3` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_user_custodian_settings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`userID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_custodian_settings`
--

LOCK TABLES `user_custodian_settings` WRITE;
/*!40000 ALTER TABLE `user_custodian_settings` DISABLE KEYS */;
INSERT INTO `user_custodian_settings` VALUES ('0a4e9724-bc84-41b3-8b9a-1f451969168d',0,0,0,0,0,0,0,'2026-02-26 12:34:51','2026-02-26 12:34:51'),('7055ff22-5c35-48ef-ae76-efb739095474',0,0,0,0,1,0,0,'2026-02-26 12:35:15','2026-02-26 12:35:15'),('7fa0df8c-3861-4f63-ba16-1806425afea0',1,1,1,1,1,1,1,'2026-02-26 09:23:35','2026-02-26 10:38:26'),('8736e80d-d756-402f-9836-a6f659de5487',0,0,0,0,0,0,0,'2026-02-26 12:34:41','2026-02-26 12:34:41'),('89960a75-bcb6-497f-9dae-b56cf2a25d31',0,0,0,0,0,0,0,'2026-02-26 12:34:56','2026-02-26 12:34:56'),('919d012a-2b0b-4ac2-a1a6-89ece32740b8',0,0,0,0,0,0,0,'2026-02-26 12:35:01','2026-02-26 12:35:01'),('9c579ffa-0806-4ed4-8677-659e7405e664',0,0,0,0,0,0,0,'2026-02-26 12:35:06','2026-02-26 12:35:06'),('a091de4a-e0b1-4f1a-8192-862fae8dd737',0,0,0,0,0,0,0,'2026-02-26 12:34:36','2026-02-26 12:34:36'),('b123c2a6-48c5-4687-a366-8ef8ae5ea9b3',0,0,0,0,1,0,0,'2026-02-26 12:35:25','2026-02-26 12:35:25');
/*!40000 ALTER TABLE `user_custodian_settings` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-26 20:20:23
