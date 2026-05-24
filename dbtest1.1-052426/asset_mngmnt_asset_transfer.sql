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
  `transfer_condition` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transfer_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
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
INSERT INTO `asset_transfer` VALUES ('109112c7-24ec-4164-ab10-d47ca0855092','2c068d4a-3d3f-41f9-b704-e3403a840e40','c61e62d6-7f80-4e41-a44d-c66440ebcd6c','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','',NULL,'2026-05-22 08:48:57',NULL),('436046c8-c578-4527-bff6-f449f39b9c7e','31cf144c-e93b-4574-88d2-1ce37c5acded','2dea847b-8bd1-477d-a459-8eeae75fbce4','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','',NULL,'2026-05-22 13:06:32',NULL),('6f1a10c1-5e1e-47d3-87a8-cfb0ee5bddea','2c068d4a-3d3f-41f9-b704-e3403a840e40','128ce212-efba-44ab-8ffd-44082591fd24','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','',NULL,'2026-05-22 08:48:57',NULL),('7cd297cc-8ea5-4192-86fe-110aaccd36af','2c068d4a-3d3f-41f9-b704-e3403a840e40','de3e9be9-6a16-4bdd-a324-24d0877b45c3','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','',NULL,'2026-05-22 08:48:57',NULL),('82b11b51-bb29-45e8-abe4-b96c4ab56034','2c068d4a-3d3f-41f9-b704-e3403a840e40','981fa622-e738-4e51-b2ae-b2115f1ed3d3','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','',NULL,'2026-05-22 08:48:57',NULL),('8e346a76-42d7-4efe-933e-689473ccde0a','2c068d4a-3d3f-41f9-b704-e3403a840e40','06888c01-64f2-4f88-a7e5-713df3e25cb7','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','',NULL,'2026-05-22 08:48:57',NULL),('92720527-1aed-4f24-b0b9-611305ecd1e4','2c068d4a-3d3f-41f9-b704-e3403a840e40','d54aedd9-a04d-4608-917b-3a745c7d1452','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','',NULL,'2026-05-22 08:48:57',NULL),('9e35e9f3-f096-4cf4-9493-e12b2d2e5fa4','2c068d4a-3d3f-41f9-b704-e3403a840e40','ae6ab522-019d-4d19-aeca-d08241edcaf7','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','',NULL,'2026-05-22 08:48:57',NULL),('a299715a-d74f-4899-ba5f-5ca9f4fa4d0c','2c068d4a-3d3f-41f9-b704-e3403a840e40','bf9b7388-9d4a-415f-9087-b7cdfe4f29d0','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','',NULL,'2026-05-22 08:48:57',NULL),('a871319d-abf5-4fa0-9d9f-06c410c64be3','2c068d4a-3d3f-41f9-b704-e3403a840e40','0e4eb2a1-e221-4ce5-9dad-f99d1d819db1','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','',NULL,'2026-05-22 08:48:57',NULL),('b3636c12-49e0-4d09-9d38-bffca532202b','0944b978-c076-4b48-b273-7267f86956c4','b6e8265d-b7e9-4b7f-8c6b-99d885a53dc6','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','',NULL,'2026-05-22 09:52:29',NULL);
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

-- Dump completed on 2026-05-24 14:55:01
