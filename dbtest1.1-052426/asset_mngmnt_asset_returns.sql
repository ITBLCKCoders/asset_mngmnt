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
INSERT INTO `asset_returns` VALUES ('0488fa81-9b33-43fe-9f9e-1ae8f7988ace','250baf6a-6de1-4cc8-9503-b0b21aad4417','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','43e44199-9726-4158-8aa9-9eb985e9ee9d','33e57bc4-bf1b-4317-b60f-8ebb4f82c5be',NULL,'2026-05-21 23:39:58','2026-05-21 23:42:34',NULL),('055f445a-8f43-45be-b263-eb4d7f1cb8be','981fa622-e738-4e51-b2ae-b2115f1ed3d3','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','Returned for transfer',NULL,NULL,NULL,'ec879bd6-65c4-47b3-93d9-cc54e4a6d308','ec879bd6-65c4-47b3-93d9-cc54e4a6d308',NULL,'2026-05-22 00:48:57','2026-05-22 00:48:57',NULL),('06a52755-97dc-4ab8-82ca-6d3d51ab184a','06888c01-64f2-4f88-a7e5-713df3e25cb7','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','Returned for transfer',NULL,NULL,NULL,'ec879bd6-65c4-47b3-93d9-cc54e4a6d308','ec879bd6-65c4-47b3-93d9-cc54e4a6d308',NULL,'2026-05-22 00:48:57','2026-05-22 00:48:57',NULL),('1213b3f3-a16a-40db-a8c8-d6e0c706e21e','3a0d794c-2333-4939-aa7b-686533e7e744','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','43e44199-9726-4158-8aa9-9eb985e9ee9d','33e57bc4-bf1b-4317-b60f-8ebb4f82c5be',NULL,'2026-05-21 23:39:58','2026-05-21 23:42:34',NULL),('18df2b08-ba37-44ab-b1c0-db566409f5fa','03a6b6a7-8bb3-4975-b854-ef44107d8ab8','65abe729-c369-447e-a864-a8e98b74b842','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','e35c527f-36a7-42c0-973b-6f4725d9bec0','1e10d25b-9ded-443f-9afa-848996743322',NULL,'2026-05-21 23:29:59','2026-05-21 23:35:17',NULL),('1ccafef3-a601-4b74-a2c0-e09bb85bceb6','d54aedd9-a04d-4608-917b-3a745c7d1452','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','Returned for transfer',NULL,NULL,NULL,'ec879bd6-65c4-47b3-93d9-cc54e4a6d308','ec879bd6-65c4-47b3-93d9-cc54e4a6d308',NULL,'2026-05-22 00:48:57','2026-05-22 00:48:57',NULL),('2b1ef01b-05ee-4545-89a9-6f1d35c35afb','1d3f10c8-c8d8-48ed-b6aa-f226566cdba1','65abe729-c369-447e-a864-a8e98b74b842','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','e35c527f-36a7-42c0-973b-6f4725d9bec0','1e10d25b-9ded-443f-9afa-848996743322',NULL,'2026-05-21 23:29:59','2026-05-21 23:35:17',NULL),('36e9afed-3fbf-46ff-b753-279d8bb941e6','56f446af-aa31-4d89-b3af-c26c44572287','65abe729-c369-447e-a864-a8e98b74b842','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','70ff71a9-9966-45cf-b5a4-def4ef7bd18b','8a7f9053-ad77-4715-a2a4-3e1e4fdd1a9e',NULL,'2026-05-21 22:55:50','2026-05-21 22:57:28',NULL),('381aa799-a6d8-42f2-a4d8-9866609cfbaf','009aee3e-e56f-4ea0-8b03-552c6c3818eb','65abe729-c369-447e-a864-a8e98b74b842','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','70ff71a9-9966-45cf-b5a4-def4ef7bd18b','8a7f9053-ad77-4715-a2a4-3e1e4fdd1a9e',NULL,'2026-05-21 22:55:50','2026-05-21 22:57:27',NULL),('3c2d5ff7-8f63-4960-9b51-04247e77a521','e5195552-84fc-43bf-9af0-b0423f870dbc','65abe729-c369-447e-a864-a8e98b74b842','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','4c228702-c165-4bbc-86ca-a074d8aef803','35aa8ca8-e7e9-4de2-b515-6a0134de82ed',NULL,'2026-05-21 23:44:39','2026-05-22 00:05:07',NULL),('3dfc9e59-7b67-4c20-b01f-8d430c1e7906','03af1fe3-da8b-482d-81ca-556761462512','65abe729-c369-447e-a864-a8e98b74b842','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','70ff71a9-9966-45cf-b5a4-def4ef7bd18b','8a7f9053-ad77-4715-a2a4-3e1e4fdd1a9e',NULL,'2026-05-21 22:55:50','2026-05-21 22:57:27',NULL),('3fbad3b2-e9c3-4bd9-9bc5-a9e8987884ca','ae6ab522-019d-4d19-aeca-d08241edcaf7','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','Returned for transfer',NULL,NULL,NULL,'ec879bd6-65c4-47b3-93d9-cc54e4a6d308','ec879bd6-65c4-47b3-93d9-cc54e4a6d308',NULL,'2026-05-22 00:48:57','2026-05-22 00:48:57',NULL),('5779506a-c409-42e8-b9c8-1c8ee337a9ac','bf9b7388-9d4a-415f-9087-b7cdfe4f29d0','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','Returned for transfer',NULL,NULL,NULL,'ec879bd6-65c4-47b3-93d9-cc54e4a6d308','ec879bd6-65c4-47b3-93d9-cc54e4a6d308',NULL,'2026-05-22 00:48:57','2026-05-22 00:48:57',NULL),('58a23db0-3238-4660-aa21-13c50fd3680b','09d877fc-1fab-4609-9c37-03ca7525124a','65abe729-c369-447e-a864-a8e98b74b842','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','70ff71a9-9966-45cf-b5a4-def4ef7bd18b','8a7f9053-ad77-4715-a2a4-3e1e4fdd1a9e',NULL,'2026-05-21 22:55:50','2026-05-21 22:57:28',NULL),('5a1cc333-16e1-4ad5-9eb1-8298e0b118bc','0e4eb2a1-e221-4ce5-9dad-f99d1d819db1','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','Returned for transfer',NULL,NULL,NULL,'ec879bd6-65c4-47b3-93d9-cc54e4a6d308','ec879bd6-65c4-47b3-93d9-cc54e4a6d308',NULL,'2026-05-22 00:48:57','2026-05-22 00:48:57',NULL),('5bbde5ed-bf3a-4e4d-8b42-16538b224774','b6e8265d-b7e9-4b7f-8c6b-99d885a53dc6','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','Returned for transfer','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','d05b0a81-f7f9-4845-a641-bf1b2d30a917','d05b0a81-f7f9-4845-a641-bf1b2d30a917',NULL,'2026-05-22 01:52:29','2026-05-22 01:52:29',NULL),('870fba04-3538-4633-a499-1ae2082e88bf','4ac3b040-04d4-48db-a6fa-b59422a6ea62','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,'9b0904e1-4984-4e7a-b810-e9d60766eca1',NULL,'2026-05-22 00:20:00','2026-05-22 00:22:25',NULL),('b3bb8b26-d898-4982-813b-f77aac52c575','128ce212-efba-44ab-8ffd-44082591fd24','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','Returned for transfer',NULL,NULL,NULL,'ec879bd6-65c4-47b3-93d9-cc54e4a6d308','ec879bd6-65c4-47b3-93d9-cc54e4a6d308',NULL,'2026-05-22 00:48:57','2026-05-22 00:48:57',NULL),('b675c543-094a-4025-9b5a-6d75b259eb72','f0d5a208-d38a-4f18-a2fa-a072f0168642','65abe729-c369-447e-a864-a8e98b74b842','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','e35c527f-36a7-42c0-973b-6f4725d9bec0','1e10d25b-9ded-443f-9afa-848996743322',NULL,'2026-05-21 23:29:59','2026-05-21 23:35:17',NULL),('be1ca8a8-ff63-40ae-9b5b-19ca875e7643','5834d499-d5ce-46d7-bd36-aab74a919281','65abe729-c369-447e-a864-a8e98b74b842','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','70ff71a9-9966-45cf-b5a4-def4ef7bd18b','8a7f9053-ad77-4715-a2a4-3e1e4fdd1a9e',NULL,'2026-05-21 22:55:50','2026-05-21 22:57:28',NULL),('c4cd792d-1f9f-44dd-b5d1-dd6bd720dba5','c61e62d6-7f80-4e41-a44d-c66440ebcd6c','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','Returned for transfer',NULL,NULL,NULL,'ec879bd6-65c4-47b3-93d9-cc54e4a6d308','ec879bd6-65c4-47b3-93d9-cc54e4a6d308',NULL,'2026-05-22 00:48:57','2026-05-22 00:48:57',NULL),('cc952e8e-57cd-4a29-9d46-54ae8a081de4','90323f31-7803-4b54-83f4-91d34c5d4fcc','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,'9b0904e1-4984-4e7a-b810-e9d60766eca1',NULL,'2026-05-22 00:20:00','2026-05-22 00:22:25',NULL),('d2a88c44-4ca7-47be-876d-3a0046f4840e','de3e9be9-6a16-4bdd-a324-24d0877b45c3','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','Returned for transfer',NULL,NULL,NULL,'ec879bd6-65c4-47b3-93d9-cc54e4a6d308','ec879bd6-65c4-47b3-93d9-cc54e4a6d308',NULL,'2026-05-22 00:48:57','2026-05-22 00:48:57',NULL),('d72a04b5-ca50-4891-b978-6593566a31ff','9ac10522-bd75-440d-ab1d-79ca8b5b010d','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,'e3b69714-319f-4399-ba18-a043d0d8a3b2',NULL,'2026-05-22 05:14:58','2026-05-22 05:14:58',NULL),('e36ddbad-96d1-4315-a444-1090779b5013','f57cc09a-3b97-4928-8578-b4df6f975553','65abe729-c369-447e-a864-a8e98b74b842','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','e35c527f-36a7-42c0-973b-6f4725d9bec0','1e10d25b-9ded-443f-9afa-848996743322',NULL,'2026-05-21 23:29:59','2026-05-21 23:35:17',NULL),('e75a0405-2b54-4075-b620-7a9b062a6f92','83e58731-c171-4d9c-867f-ac3e6b40a87b','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,'9b0904e1-4984-4e7a-b810-e9d60766eca1',NULL,'2026-05-22 00:20:00','2026-05-22 00:22:25',NULL),('eeec07e6-3e9c-41a6-ba15-965d775d3926','8bdf9e50-c8c2-49fc-b53d-01176b5b30ae','65abe729-c369-447e-a864-a8e98b74b842','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','4c228702-c165-4bbc-86ca-a074d8aef803','35aa8ca8-e7e9-4de2-b515-6a0134de82ed',NULL,'2026-05-21 23:44:39','2026-05-22 00:05:07',NULL),('f044119a-e24c-4b30-9c2f-1075fa25e657','bf13c1bc-b965-4a14-b6a9-6e349582dd90','65abe729-c369-447e-a864-a8e98b74b842','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','e35c527f-36a7-42c0-973b-6f4725d9bec0','1e10d25b-9ded-443f-9afa-848996743322',NULL,'2026-05-21 23:29:59','2026-05-21 23:35:17',NULL),('f4031934-e710-4f9a-97ed-c605c0a9a3fb','2dea847b-8bd1-477d-a459-8eeae75fbce4','86caed5e-b6f8-442a-8423-168d9ad4a579','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,'84ed744c-4bae-4857-af6f-0123b8e98842',NULL,'2026-05-22 04:48:13','2026-05-22 04:54:36',NULL);
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

-- Dump completed on 2026-05-24 14:55:05
