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
-- Table structure for table `transfer_form_assignments`
--

DROP TABLE IF EXISTS `transfer_form_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transfer_form_assignments` (
  `form_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `assignment_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `transfer_condition` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transfer_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `condition_images` json DEFAULT NULL,
  PRIMARY KEY (`form_id`,`assignment_id`),
  KEY `idx_tfa_form_id` (`form_id`),
  KEY `idx_tfa_assignment_id` (`assignment_id`),
  CONSTRAINT `fk_tfa_assignment_id` FOREIGN KEY (`assignment_id`) REFERENCES `asset_assignments` (`assignmentID`) ON DELETE CASCADE,
  CONSTRAINT `fk_tfa_form_id` FOREIGN KEY (`form_id`) REFERENCES `asset_transfer_forms` (`formID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transfer_form_assignments`
--

LOCK TABLES `transfer_form_assignments` WRITE;
/*!40000 ALTER TABLE `transfer_form_assignments` DISABLE KEYS */;
INSERT INTO `transfer_form_assignments` VALUES ('0944b978-c076-4b48-b273-7267f86956c4','b6e8265d-b7e9-4b7f-8c6b-99d885a53dc6','2026-05-22 08:59:27','Good','',NULL),('1f1e61d8-75e9-4839-ac23-6c4118e1155f','9ac10522-bd75-440d-ab1d-79ca8b5b010d','2026-05-22 13:14:58',NULL,NULL,NULL),('2c068d4a-3d3f-41f9-b704-e3403a840e40','06888c01-64f2-4f88-a7e5-713df3e25cb7','2026-05-22 08:31:33','Good','',NULL),('2c068d4a-3d3f-41f9-b704-e3403a840e40','0e4eb2a1-e221-4ce5-9dad-f99d1d819db1','2026-05-22 08:31:33','Good','',NULL),('2c068d4a-3d3f-41f9-b704-e3403a840e40','128ce212-efba-44ab-8ffd-44082591fd24','2026-05-22 08:31:33','Good','',NULL),('2c068d4a-3d3f-41f9-b704-e3403a840e40','981fa622-e738-4e51-b2ae-b2115f1ed3d3','2026-05-22 08:31:33','Good','',NULL),('2c068d4a-3d3f-41f9-b704-e3403a840e40','ae6ab522-019d-4d19-aeca-d08241edcaf7','2026-05-22 08:31:33','Good','',NULL),('2c068d4a-3d3f-41f9-b704-e3403a840e40','bf9b7388-9d4a-415f-9087-b7cdfe4f29d0','2026-05-22 08:31:33','Good','',NULL),('2c068d4a-3d3f-41f9-b704-e3403a840e40','c61e62d6-7f80-4e41-a44d-c66440ebcd6c','2026-05-22 08:31:33','Good','',NULL),('2c068d4a-3d3f-41f9-b704-e3403a840e40','d54aedd9-a04d-4608-917b-3a745c7d1452','2026-05-22 08:31:33','Good','',NULL),('2c068d4a-3d3f-41f9-b704-e3403a840e40','de3e9be9-6a16-4bdd-a324-24d0877b45c3','2026-05-22 08:31:33','Good','',NULL),('31cf144c-e93b-4574-88d2-1ce37c5acded','2dea847b-8bd1-477d-a459-8eeae75fbce4','2026-05-22 12:48:13',NULL,NULL,NULL);
/*!40000 ALTER TABLE `transfer_form_assignments` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-24 14:55:00
