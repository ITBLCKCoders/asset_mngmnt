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
-- Table structure for table `custodians`
--

DROP TABLE IF EXISTS `custodians`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `custodians` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `asset_type` enum('it','admin') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `manager_role` enum('none','itManager','adminManager','overallManager') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  `access_levels` json NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_asset_type` (`user_id`,`asset_type`),
  KEY `idx_custodians_user_id` (`user_id`),
  KEY `idx_custodians_asset_type` (`asset_type`),
  KEY `idx_custodians_manager_role` (`manager_role`),
  CONSTRAINT `custodians_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`userID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `custodians`
--

LOCK TABLES `custodians` WRITE;
/*!40000 ALTER TABLE `custodians` DISABLE KEYS */;
INSERT INTO `custodians` VALUES (1,'65abe729-c369-447e-a864-a8e98b74b842','it','none','{\"assign\": true, \"return\": true, \"addEdit\": true, \"disposal\": false, \"transfer\": false}','2026-01-18 13:52:36','2026-01-18 17:38:16',NULL),(5,'7fa0df8c-3861-4f63-ba16-1806425afea0','it','none','{\"assign\": true, \"return\": true, \"addEdit\": true, \"disposal\": true, \"transfer\": true}','2026-02-05 01:38:08','2026-02-05 01:38:08',NULL),(6,'51835ade-65e8-4b23-9489-3d66872b831d','it','none','{\"assign\": true, \"return\": true, \"addEdit\": true, \"disposal\": true, \"transfer\": true}','2026-02-05 01:38:20','2026-02-05 01:38:20',NULL),(7,'2757e5eb-e6be-49f5-a8d6-eefaa7408e10','it','none','{\"assign\": true, \"return\": true, \"addEdit\": true, \"disposal\": true, \"transfer\": true}','2026-02-05 01:38:25','2026-02-05 01:38:25',NULL);
/*!40000 ALTER TABLE `custodians` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-28 22:49:00
