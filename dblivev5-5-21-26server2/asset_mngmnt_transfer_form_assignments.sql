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
INSERT INTO `transfer_form_assignments` VALUES ('02171fb8-a313-47c0-9225-bb2f87989c82','0736d480-b15f-4d62-8bb5-d2171ad56fba','2026-03-03 08:16:07','Good','',NULL),('02171fb8-a313-47c0-9225-bb2f87989c82','185b2943-bde5-4207-ab5c-6dbc37fde799','2026-03-03 08:16:07','Good','',NULL),('02171fb8-a313-47c0-9225-bb2f87989c82','29d58c58-add6-4702-814d-ca474f57aae3','2026-03-03 08:16:07','Good','',NULL),('02171fb8-a313-47c0-9225-bb2f87989c82','3686ce78-d17c-4f4f-a1c9-4cbc6585a255','2026-03-03 08:16:07','Good','',NULL),('02171fb8-a313-47c0-9225-bb2f87989c82','68cc5987-3ee9-43dc-a614-62bebcf81d0f','2026-03-03 08:16:07','Good','',NULL),('02171fb8-a313-47c0-9225-bb2f87989c82','cb457a0f-b8d5-4fd8-b9d6-32db8d0cfc6f','2026-03-03 08:16:07','Good','',NULL),('4f88456b-5d20-4996-9bb0-7b6f299f1b64','1ca9d19b-aaa9-43f7-a602-3f183ec3b33a','2026-03-03 08:28:00',NULL,NULL,NULL),('54403cc8-97b1-490d-bcea-54175c05df02','3af7fd68-d997-4f4a-8aa5-f50e1a64a86a','2026-03-01 22:49:13','Good','',NULL),('54403cc8-97b1-490d-bcea-54175c05df02','857d6788-a902-45b4-9023-d9efbde93062','2026-03-01 22:49:13','Good','',NULL),('54403cc8-97b1-490d-bcea-54175c05df02','ed6e1469-00be-40e2-b32f-27a9ba34d0d7','2026-03-01 22:49:13','Good','',NULL),('54f58718-4e8e-4433-aea3-228ca899baee','430bd098-1e3e-4fb7-8151-bcb0d7f0c8a6','2026-03-03 07:46:19','Good','',NULL),('6dbb5d27-a5eb-45fc-8f13-ac4c38936262','32be7ebe-0a95-47be-8f9b-cf5606e46424','2026-03-03 10:01:44',NULL,NULL,NULL),('8a6e5abc-104f-484b-8b4b-87e1b97d3d61','c9d04675-1f15-46d8-9355-4191cc0ee9e8','2026-03-02 14:26:05','Good','',NULL),('a81e9b21-4316-4a59-8ab8-92d31e2fc927','4a44cd7a-1e21-4158-be90-2eed95835d44','2026-03-03 08:22:08','Good','',NULL),('a81e9b21-4316-4a59-8ab8-92d31e2fc927','60db773d-b003-47db-89fd-63c42cb82f50','2026-03-03 08:22:08','Good','',NULL),('d8f5a2be-790c-441a-ade9-284c5796fd1c','107ff39c-96fe-4b1a-9850-78aa8670e38a','2026-02-28 22:34:42',NULL,NULL,NULL),('d8f5a2be-790c-441a-ade9-284c5796fd1c','2d0e2fb8-7e60-4e34-b075-7a32c9a790fe','2026-02-28 22:34:42',NULL,NULL,NULL);
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

-- Dump completed on 2026-05-21 22:55:05
