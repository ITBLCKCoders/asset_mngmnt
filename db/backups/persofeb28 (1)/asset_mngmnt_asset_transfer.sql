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
INSERT INTO `asset_transfer` VALUES ('34fcffbd-1438-4086-b08a-3898c987be93','dd492527-9daa-43c4-9956-08c9a98d56ac','8e87e0ed-52ed-43ac-998f-06c07baaea6f','65abe729-c369-447e-a864-a8e98b74b842','Good','',NULL,'2026-02-28 19:29:27',NULL),('387121ed-0cf6-4c0e-9b3c-0c37cd736000','91355d48-8684-4e69-a955-37c88663ccc7','261caa05-3417-4fb2-8d95-27b505ad2fa0','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','',NULL,'2026-02-28 19:37:24',NULL),('67ae817d-f1e1-4594-a0d4-b64c5de59dd5','dd492527-9daa-43c4-9956-08c9a98d56ac','96fc7561-b76c-4ca9-bd5b-60f801ffeca3','65abe729-c369-447e-a864-a8e98b74b842','Good','',NULL,'2026-02-28 19:29:27',NULL),('6e7fae41-161f-4037-9447-41ac14abd7af','0ceb22ae-7e65-495d-9f04-9cce47658bf1','14ad29ee-e0a1-4799-9976-fc54f328aadc','65abe729-c369-447e-a864-a8e98b74b842','Good','',NULL,'2026-02-28 20:30:54',NULL),('b0698140-bf96-46f0-9487-09df315c8467','dd492527-9daa-43c4-9956-08c9a98d56ac','9473f5d3-1737-48d7-8a57-354ccfde2562','65abe729-c369-447e-a864-a8e98b74b842','Good','',NULL,'2026-02-28 19:29:27',NULL),('cc102562-7154-4375-becf-0827f080b272','0ceb22ae-7e65-495d-9f04-9cce47658bf1','fe4d3a88-1353-406d-ae93-05f62a73dbf4','65abe729-c369-447e-a864-a8e98b74b842','Good','',NULL,'2026-02-28 20:30:54',NULL),('ccdf3f12-0524-466c-a3cb-aff6c76e3868','91355d48-8684-4e69-a955-37c88663ccc7','e167d012-7d6d-4ec4-a2c1-cc1de50e3295','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','',NULL,'2026-02-28 19:37:24',NULL),('cf8e7a01-4809-45c2-a62c-07429504b017','91355d48-8684-4e69-a955-37c88663ccc7','6fd7f66e-0a2a-4a1f-81a0-6b343c9906d7','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','',NULL,'2026-02-28 19:37:24',NULL),('e20d1f2d-4331-4543-b297-3a75dce68d56','d8f5a2be-790c-441a-ade9-284c5796fd1c','107ff39c-96fe-4b1a-9850-78aa8670e38a','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','',NULL,'2026-02-28 22:48:09',NULL),('e9236560-b272-497d-bbac-85f07e0c60ad','0ceb22ae-7e65-495d-9f04-9cce47658bf1','ff49fbd9-fa46-473f-bb85-2a9e9e1cb07f','65abe729-c369-447e-a864-a8e98b74b842','Good','',NULL,'2026-02-28 20:30:54',NULL),('ed0fbe72-20ec-430f-b3c2-cca310e95e6c','d8f5a2be-790c-441a-ade9-284c5796fd1c','2d0e2fb8-7e60-4e34-b075-7a32c9a790fe','7fa0df8c-3861-4f63-ba16-1806425afea0','Good','',NULL,'2026-02-28 22:48:09',NULL);
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

-- Dump completed on 2026-02-28 22:48:58
