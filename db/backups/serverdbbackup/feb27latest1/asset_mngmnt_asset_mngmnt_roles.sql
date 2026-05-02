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
-- Table structure for table `asset_mngmnt_roles`
--

DROP TABLE IF EXISTS `asset_mngmnt_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_mngmnt_roles` (
  `roleID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `asset_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'it | admin',
  `manager_role` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'none | itManager | adminManager | overallManager',
  `access_add_edit` tinyint NOT NULL DEFAULT '0',
  `access_assignment` tinyint NOT NULL DEFAULT '0',
  `access_return` tinyint NOT NULL DEFAULT '0',
  `hr_accountability_receiver` tinyint NOT NULL DEFAULT '0',
  `manager_approver_1` tinyint NOT NULL DEFAULT '0',
  `manager_approver_2` tinyint NOT NULL DEFAULT '0',
  `manager_approver_3` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`roleID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_mngmnt_roles`
--

LOCK TABLES `asset_mngmnt_roles` WRITE;
/*!40000 ALTER TABLE `asset_mngmnt_roles` DISABLE KEYS */;
INSERT INTO `asset_mngmnt_roles` VALUES ('5ef9ba35-0232-11f1-a629-b8cb29c59adf','Employee',NULL,NULL,NULL,0,0,0,0,0,0,0,'2026-02-05 09:31:19','65abe729-c369-447e-a864-a8e98b74b842','2026-02-05 09:31:19','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('8af61a58-cddc-11f0-9c5f-047c16a24f9f','Admin','Admin',NULL,NULL,0,0,0,0,0,0,0,'2025-11-30 19:05:55','65abe729-c369-447e-a864-a8e98b74b842','2025-11-30 19:05:55','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('9391558d-cddc-11f0-9c5f-047c16a24f9f','Executive','Executive',NULL,NULL,0,0,0,0,0,0,0,'2025-11-30 19:06:10','65abe729-c369-447e-a864-a8e98b74b842','2026-02-05 09:31:01','65abe729-c369-447e-a864-a8e98b74b842','2026-02-05 09:31:01','65abe729-c369-447e-a864-a8e98b74b842'),('9827115a-cdba-11f0-acd5-047c16a24f9f','Super Admin','Super Administrator with full access to all system features',NULL,NULL,1,1,1,1,1,1,1,'2025-11-30 15:02:54',NULL,'2026-02-19 09:35:32','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('9acc1bdd-cddc-11f0-9c5f-047c16a24f9f','Directorial','Directorial',NULL,NULL,0,0,0,0,0,0,0,'2025-11-30 19:06:22','65abe729-c369-447e-a864-a8e98b74b842','2026-02-05 09:30:58','65abe729-c369-447e-a864-a8e98b74b842','2026-02-05 09:30:58','65abe729-c369-447e-a864-a8e98b74b842'),('9c51fa12-113b-11f1-97a8-b8cb29c59adf','IT Support',NULL,'it',NULL,1,1,1,0,0,0,0,'2026-02-24 12:45:14','65abe729-c369-447e-a864-a8e98b74b842','2026-02-24 12:45:14','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL),('a6bf2950-cddc-11f0-9c5f-047c16a24f9f','Managerial','Managerial',NULL,NULL,0,0,0,0,0,0,0,'2025-11-30 19:06:42','65abe729-c369-447e-a864-a8e98b74b842','2026-02-05 09:31:03','65abe729-c369-447e-a864-a8e98b74b842','2026-02-05 09:31:03','65abe729-c369-447e-a864-a8e98b74b842'),('acea3473-cddc-11f0-9c5f-047c16a24f9f','Officer','Officer',NULL,NULL,0,0,0,0,0,0,0,'2025-11-30 19:06:52','65abe729-c369-447e-a864-a8e98b74b842','2026-02-05 09:31:06','65abe729-c369-447e-a864-a8e98b74b842','2026-02-05 09:31:06','65abe729-c369-447e-a864-a8e98b74b842'),('b19d139a-cddc-11f0-9c5f-047c16a24f9f','Rank & File','Rank & File',NULL,NULL,0,0,0,0,0,0,0,'2025-11-30 19:07:00','65abe729-c369-447e-a864-a8e98b74b842','2026-02-05 09:31:10','65abe729-c369-447e-a864-a8e98b74b842','2026-02-05 09:31:10','65abe729-c369-447e-a864-a8e98b74b842');
/*!40000 ALTER TABLE `asset_mngmnt_roles` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-27 13:48:06
