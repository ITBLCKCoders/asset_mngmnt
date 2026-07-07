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
-- Table structure for table `asset_returns`
--

DROP TABLE IF EXISTS `asset_returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_returns` (
  `return_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `assignment_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `return_condition` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `return_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `return_location_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Location where asset was returned to',
  `return_location_room_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Room/area where asset was returned to',
  `return_department_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Department where asset was returned to',
  `return_batch_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `form_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `condition_images` json DEFAULT NULL COMMENT 'Array of Cloudinary URLs for return condition photos',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`return_id`),
  KEY `idx_asset_returns_assignment_id` (`assignment_id`),
  KEY `idx_asset_returns_user_id` (`user_id`),
  KEY `idx_asset_returns_return_location_id` (`return_location_id`),
  KEY `idx_asset_returns_return_location_room_id` (`return_location_room_id`),
  KEY `idx_asset_returns_return_department_id` (`return_department_id`),
  KEY `idx_asset_returns_return_batch_id` (`return_batch_id`),
  KEY `idx_asset_returns_form_id` (`form_id`),
  CONSTRAINT `fk_asset_returns_assignment_id` FOREIGN KEY (`assignment_id`) REFERENCES `asset_assignments` (`assignmentID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_returns_form_id` FOREIGN KEY (`form_id`) REFERENCES `asset_return_forms` (`formID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_returns_return_department_id` FOREIGN KEY (`return_department_id`) REFERENCES `asset_mngmnt_departments` (`departmentID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_returns_return_location_id` FOREIGN KEY (`return_location_id`) REFERENCES `asset_mngmnt_locations` (`locationID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_returns_return_location_room_id` FOREIGN KEY (`return_location_room_id`) REFERENCES `asset_mngmnt_location_rooms` (`roomID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_returns_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`userID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_returns`
--

LOCK TABLES `asset_returns` WRITE;
/*!40000 ALTER TABLE `asset_returns` DISABLE KEYS */;
INSERT INTO `asset_returns` VALUES ('15e127d5-8afe-4d3c-82c6-e04d76e878ac','87ebb826-7c9e-4569-8a5a-d28c4b3785d1','c289a49c-219c-4e82-a052-334e42506b36','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','20c824fd-048a-4b14-96b2-f0791c815b7a','81e5e97a-6eda-4812-b102-91663c98fb04',NULL,'2026-05-27 23:39:28','2026-05-27 23:39:51',NULL),('18ce124a-8b2a-415c-8ec6-24d34a1d9bb8','2a149201-4d19-4314-ba03-500718320a49','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','Returned for transfer','613f323f-f4df-11f0-9f53-18c04d003e97','615cd0a3-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','c86846d8-d3ae-4d05-a031-a225cefe2f05','c86846d8-d3ae-4d05-a031-a225cefe2f05',NULL,'2026-05-27 23:50:16','2026-05-27 23:50:16',NULL),('36b8184a-cb8d-4f6f-9c8d-32117ca25585','cab28d12-bb05-4349-b6c8-42f5d1eff544','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','Returned for transfer','613f323f-f4df-11f0-9f53-18c04d003e97','615cd0a3-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','c86846d8-d3ae-4d05-a031-a225cefe2f05','c86846d8-d3ae-4d05-a031-a225cefe2f05',NULL,'2026-05-27 23:50:16','2026-05-27 23:50:16',NULL),('597b0b1e-7100-401a-8a27-afbda3b6a07b','7d2ae62e-a7f9-457d-9b0f-653ede2f5210','c289a49c-219c-4e82-a052-334e42506b36','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','20c824fd-048a-4b14-96b2-f0791c815b7a','81e5e97a-6eda-4812-b102-91663c98fb04',NULL,'2026-05-27 23:39:28','2026-05-27 23:39:51',NULL),('6d2bab6e-c8bb-43da-8f6d-423af6b8c239','d9f136b3-0593-4198-9782-5b6226848a09','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','Returned for transfer','613f323f-f4df-11f0-9f53-18c04d003e97','615cd0a3-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','c86846d8-d3ae-4d05-a031-a225cefe2f05','c86846d8-d3ae-4d05-a031-a225cefe2f05',NULL,'2026-05-27 23:50:16','2026-05-27 23:50:16',NULL),('95ffb5c4-880e-4611-8232-091530d7a9d3','e3febee4-8fb9-469d-856e-44a933a4cf0c','c289a49c-219c-4e82-a052-334e42506b36','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','20c824fd-048a-4b14-96b2-f0791c815b7a','81e5e97a-6eda-4812-b102-91663c98fb04',NULL,'2026-05-27 23:39:28','2026-05-27 23:39:51',NULL),('b9e5d834-dff5-4241-83a7-8600f6f43f1e','23ac515a-a438-41ee-b3a0-4447d43f48d6','c289a49c-219c-4e82-a052-334e42506b36','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','20c824fd-048a-4b14-96b2-f0791c815b7a','81e5e97a-6eda-4812-b102-91663c98fb04',NULL,'2026-05-27 23:39:28','2026-05-27 23:39:50',NULL),('c9ab8900-54a8-4233-b59e-de009412b3ee','9a88ea76-3173-4e84-95bd-2257fdbd5c1e','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','Returned for transfer','613f323f-f4df-11f0-9f53-18c04d003e97','615cd0a3-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','c86846d8-d3ae-4d05-a031-a225cefe2f05','c86846d8-d3ae-4d05-a031-a225cefe2f05',NULL,'2026-05-27 23:50:16','2026-05-27 23:50:16',NULL),('dd0f8930-4980-479d-9509-b80b97f6eac5','53ff00da-f971-4081-be25-a56a93a4decb','c289a49c-219c-4e82-a052-334e42506b36','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','20c824fd-048a-4b14-96b2-f0791c815b7a','81e5e97a-6eda-4812-b102-91663c98fb04',NULL,'2026-05-27 23:39:28','2026-05-27 23:39:51',NULL),('e730fdd9-a656-4588-b89f-addbd2c97505','540f9cee-aa7e-41a2-bbaf-0da489c23c57','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','Returned for transfer','613f323f-f4df-11f0-9f53-18c04d003e97','615cd0a3-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','c86846d8-d3ae-4d05-a031-a225cefe2f05','c86846d8-d3ae-4d05-a031-a225cefe2f05',NULL,'2026-05-27 23:50:16','2026-05-27 23:50:16',NULL),('f580ea80-93f5-4a43-ba57-1d7132c4a9cf','4bb1ec82-6044-4f5c-8e71-f76487457489','c289a49c-219c-4e82-a052-334e42506b36','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','20c824fd-048a-4b14-96b2-f0791c815b7a','81e5e97a-6eda-4812-b102-91663c98fb04',NULL,'2026-05-27 23:39:28','2026-05-27 23:39:51',NULL),('f791c805-5811-46e0-bf49-c1739e86ea23','da65d4b4-faf2-457b-8ad0-7a194fada404','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','Returned for transfer','613f323f-f4df-11f0-9f53-18c04d003e97','615cd0a3-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','c86846d8-d3ae-4d05-a031-a225cefe2f05','c86846d8-d3ae-4d05-a031-a225cefe2f05',NULL,'2026-05-27 23:50:16','2026-05-27 23:50:16',NULL);
/*!40000 ALTER TABLE `asset_returns` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-29  7:54:26
