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
-- Table structure for table `asset_documents`
--

DROP TABLE IF EXISTS `asset_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_documents` (
  `documentID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `asset_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_url` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int NOT NULL,
  `file_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`documentID`),
  KEY `asset_id` (`asset_id`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`),
  KEY `deleted_by` (`deleted_by`),
  CONSTRAINT `asset_documents_ibfk_1` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`assetID`) ON DELETE CASCADE,
  CONSTRAINT `asset_documents_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL,
  CONSTRAINT `asset_documents_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL,
  CONSTRAINT `asset_documents_ibfk_4` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_documents`
--

LOCK TABLES `asset_documents` WRITE;
/*!40000 ALTER TABLE `asset_documents` DISABLE KEYS */;
INSERT INTO `asset_documents` VALUES ('06667ad0-1eb1-11f1-97a8-b8cb29c59adf','04e61f52-1eb1-11f1-97a8-b8cb29c59adf','{\"filename\":\"IT_TF_DEVICE_CMTHTOROHL.pdf\",\"encoding\":\"7bit\",\"mimeType\":\"application/pdf\"}','https://res.cloudinary.com/dp0tpwusz/raw/upload/v1773386490/asset-documents/%5Bobject%20Object%5D',975840,'application/octet-stream','2026-03-13 15:48:29','90a1439a-0d3d-4eee-8a4d-b40d9e0755f7','2026-03-13 15:48:29','90a1439a-0d3d-4eee-8a4d-b40d9e0755f7',NULL,NULL),('5355c564-1eb0-11f1-97a8-b8cb29c59adf','510f791a-1eb0-11f1-97a8-b8cb29c59adf','{\"filename\":\"IT_TF_DEVICE_CMTHTOROHL.pdf\",\"encoding\":\"7bit\",\"mimeType\":\"application/pdf\"}','https://res.cloudinary.com/dp0tpwusz/raw/upload/v1773386490/asset-documents/%5Bobject%20Object%5D',975840,'application/octet-stream','2026-03-13 15:43:28','90a1439a-0d3d-4eee-8a4d-b40d9e0755f7','2026-03-13 15:43:28','90a1439a-0d3d-4eee-8a4d-b40d9e0755f7',NULL,NULL),('6aadd748-1eb1-11f1-97a8-b8cb29c59adf','68fe7648-1eb1-11f1-97a8-b8cb29c59adf','{\"filename\":\"IT_TF_DEVICE_CMTHTOROHL.pdf\",\"encoding\":\"7bit\",\"mimeType\":\"application/pdf\"}','https://res.cloudinary.com/dp0tpwusz/raw/upload/v1773386490/asset-documents/%5Bobject%20Object%5D',975840,'application/octet-stream','2026-03-13 15:51:17','90a1439a-0d3d-4eee-8a4d-b40d9e0755f7','2026-03-13 15:51:17','90a1439a-0d3d-4eee-8a4d-b40d9e0755f7',NULL,NULL),('6eb68830-1ead-11f1-97a8-b8cb29c59adf','6cc5cd75-1ead-11f1-97a8-b8cb29c59adf','{\"filename\":\"IT_TF_DEVICE_CMTHTOROHL.pdf\",\"encoding\":\"7bit\",\"mimeType\":\"application/pdf\"}','https://res.cloudinary.com/dp0tpwusz/raw/upload/v1773386490/asset-documents/%5Bobject%20Object%5D',975840,'application/octet-stream','2026-03-13 15:22:46','90a1439a-0d3d-4eee-8a4d-b40d9e0755f7','2026-03-13 15:22:46','90a1439a-0d3d-4eee-8a4d-b40d9e0755f7',NULL,NULL),('b72db950-1eb0-11f1-97a8-b8cb29c59adf','b5c683b7-1eb0-11f1-97a8-b8cb29c59adf','{\"filename\":\"IT_TF_DEVICE_CMTHTOROHL.pdf\",\"encoding\":\"7bit\",\"mimeType\":\"application/pdf\"}','https://res.cloudinary.com/dp0tpwusz/raw/upload/v1773386490/asset-documents/%5Bobject%20Object%5D',975840,'application/octet-stream','2026-03-13 15:46:16','90a1439a-0d3d-4eee-8a4d-b40d9e0755f7','2026-03-13 15:46:16','90a1439a-0d3d-4eee-8a4d-b40d9e0755f7',NULL,NULL),('d467c16e-1eaf-11f1-97a8-b8cb29c59adf','d2bd2f40-1eaf-11f1-97a8-b8cb29c59adf','{\"filename\":\"IT_TF_DEVICE_CMTHTOROHL.pdf\",\"encoding\":\"7bit\",\"mimeType\":\"application/pdf\"}','https://res.cloudinary.com/dp0tpwusz/raw/upload/v1773386490/asset-documents/%5Bobject%20Object%5D',975840,'application/octet-stream','2026-03-13 15:39:55','90a1439a-0d3d-4eee-8a4d-b40d9e0755f7','2026-03-13 15:39:55','90a1439a-0d3d-4eee-8a4d-b40d9e0755f7',NULL,NULL);
/*!40000 ALTER TABLE `asset_documents` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-29  7:54:25
