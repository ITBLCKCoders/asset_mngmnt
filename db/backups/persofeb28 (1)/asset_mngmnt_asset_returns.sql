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
INSERT INTO `asset_returns` VALUES ('129f165a-fcd8-4a6b-8d3b-c8028c3cffc9','fe4d3a88-1353-406d-ae93-05f62a73dbf4','65abe729-c369-447e-a864-a8e98b74b842','Good','Returned for transfer','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','d24a071d-3e9f-496d-9703-9522f5d06953','d24a071d-3e9f-496d-9703-9522f5d06953',NULL,'2026-02-28 12:30:54','2026-02-28 12:30:54',NULL),('19385213-cb6b-4eff-a598-a7fb75c7bf44','5b6cfa96-720b-4774-a0d8-baa08ee58075','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','5df50ed7-a9c3-4673-8ec1-17e6502e4935','e2f9bbb9-6f74-47ee-83a9-fb853a333bc1',NULL,'2026-02-28 11:27:46','2026-02-28 11:27:46',NULL),('1ab459df-d889-40b8-b4c8-df4b009f2f54','96fc7561-b76c-4ca9-bd5b-60f801ffeca3','65abe729-c369-447e-a864-a8e98b74b842','Good','Returned for transfer','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','c187fae1-20b0-4efa-9fed-4ad42639f5cd','c187fae1-20b0-4efa-9fed-4ad42639f5cd',NULL,'2026-02-28 11:29:27','2026-02-28 11:29:27',NULL),('2644ae5a-4a1b-42fa-b21b-a99c6afc95ef','70a65cf4-7b33-45f5-8c2c-0f7128c81374','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,'19e081b4-0dd1-4db2-a8f3-d0b3e8e34d96',NULL,'2026-02-28 13:39:27','2026-02-28 14:10:04',NULL),('3a1bc8a7-c23b-4fd1-9cbf-af0879af2022','9473f5d3-1737-48d7-8a57-354ccfde2562','65abe729-c369-447e-a864-a8e98b74b842','Good','Returned for transfer','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','c187fae1-20b0-4efa-9fed-4ad42639f5cd','c187fae1-20b0-4efa-9fed-4ad42639f5cd',NULL,'2026-02-28 11:29:27','2026-02-28 11:29:27',NULL),('48dcfa88-e359-4bbd-8681-a545f76663ed','6fd7f66e-0a2a-4a1f-81a0-6b343c9906d7','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','Returned for transfer','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','8961cb23-7593-48da-8c90-abdc05513860','8961cb23-7593-48da-8c90-abdc05513860',NULL,'2026-02-28 11:37:24','2026-02-28 11:37:24',NULL),('4ed8ab14-efcb-4f6e-aa60-caa3bc0cdccc','261caa05-3417-4fb2-8d95-27b505ad2fa0','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','Returned for transfer','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','8961cb23-7593-48da-8c90-abdc05513860','8961cb23-7593-48da-8c90-abdc05513860',NULL,'2026-02-28 11:37:24','2026-02-28 11:37:24',NULL),('8194768b-6a80-4c36-9af6-731d99bd28cf','75d71451-2219-4f96-9dce-053e0653988d','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97',NULL,'19e081b4-0dd1-4db2-a8f3-d0b3e8e34d96',NULL,'2026-02-28 13:39:27','2026-02-28 14:10:04',NULL),('aaaceb32-b297-4afb-b3e6-75e8c2ab57f2','2d0e2fb8-7e60-4e34-b075-7a32c9a790fe','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','Returned for transfer',NULL,NULL,NULL,'76ddaf64-055f-42d6-aaef-8e5b7d618083','76ddaf64-055f-42d6-aaef-8e5b7d618083',NULL,'2026-02-28 14:48:09','2026-02-28 14:48:09',NULL),('b2b22ed0-7de3-402d-bdd3-68226c100087','51f94e67-de70-4d6d-9dee-47fac04a257e','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','5df50ed7-a9c3-4673-8ec1-17e6502e4935','e2f9bbb9-6f74-47ee-83a9-fb853a333bc1',NULL,'2026-02-28 11:27:46','2026-02-28 11:27:46',NULL),('b5e72e92-7da7-4556-9eff-c7de7bafaba6','e167d012-7d6d-4ec4-a2c1-cc1de50e3295','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','Returned for transfer','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','8961cb23-7593-48da-8c90-abdc05513860','8961cb23-7593-48da-8c90-abdc05513860',NULL,'2026-02-28 11:37:24','2026-02-28 11:37:24',NULL),('b7fcfdeb-da17-47dd-aca7-03b5f54e4001','107ff39c-96fe-4b1a-9850-78aa8670e38a','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','Returned for transfer',NULL,NULL,NULL,'76ddaf64-055f-42d6-aaef-8e5b7d618083','76ddaf64-055f-42d6-aaef-8e5b7d618083',NULL,'2026-02-28 14:48:09','2026-02-28 14:48:09',NULL),('e2ab2324-575e-49a0-abc4-a8078937420c','ff49fbd9-fa46-473f-bb85-2a9e9e1cb07f','65abe729-c369-447e-a864-a8e98b74b842','Good','Returned for transfer','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','d24a071d-3e9f-496d-9703-9522f5d06953','d24a071d-3e9f-496d-9703-9522f5d06953',NULL,'2026-02-28 12:30:54','2026-02-28 12:30:54',NULL),('e6670bdf-bfea-4d9c-8b06-de6737f39f1a','14ad29ee-e0a1-4799-9976-fc54f328aadc','65abe729-c369-447e-a864-a8e98b74b842','Good','Returned for transfer','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','d24a071d-3e9f-496d-9703-9522f5d06953','d24a071d-3e9f-496d-9703-9522f5d06953',NULL,'2026-02-28 12:30:54','2026-02-28 12:30:54',NULL),('ef2045ed-0afc-4523-88d2-85c6755d9c11','8e87e0ed-52ed-43ac-998f-06c07baaea6f','65abe729-c369-447e-a864-a8e98b74b842','Good','Returned for transfer','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','c187fae1-20b0-4efa-9fed-4ad42639f5cd','c187fae1-20b0-4efa-9fed-4ad42639f5cd',NULL,'2026-02-28 11:29:27','2026-02-28 11:29:27',NULL),('f72d9e96-acb9-48b2-840b-9cbd5b2067b0','6200db68-82cd-4c88-a18b-49f8e8c9acef','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','430a3a44-cfd8-11f0-9d93-18c04d003e97','5df50ed7-a9c3-4673-8ec1-17e6502e4935','e2f9bbb9-6f74-47ee-83a9-fb853a333bc1',NULL,'2026-02-28 11:27:46','2026-02-28 11:27:46',NULL);
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

-- Dump completed on 2026-02-28 22:48:55
