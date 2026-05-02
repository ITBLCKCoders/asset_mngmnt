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
  `return_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assignment_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `return_condition` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `return_notes` text COLLATE utf8mb4_unicode_ci,
  `pdf_file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`return_id`),
  KEY `idx_asset_returns_assignment_id` (`assignment_id`),
  KEY `idx_asset_returns_user_id` (`user_id`),
  CONSTRAINT `fk_asset_returns_assignment_id` FOREIGN KEY (`assignment_id`) REFERENCES `asset_assignments` (`assignmentID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_returns_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`userID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_returns`
--

LOCK TABLES `asset_returns` WRITE;
/*!40000 ALTER TABLE `asset_returns` DISABLE KEYS */;
INSERT INTO `asset_returns` VALUES ('2ba1b1f7-7315-40b8-8cf9-b4d0eef07a26','d1f75fb9-34f1-4e53-8ba0-e0f9f29f8757','65abe729-c369-447e-a864-a8e98b74b842','Good','dsa - Condition: Good','C:\\Users\\magda\\Desktop\\work\\asset_mngmnt\\server\\uploads\\asset-returns\\pdf-1768764191260-837880190.pdf','2026-01-18 19:23:11','2026-01-18 19:23:11',NULL),('2bab75a6-c16a-4370-b10b-d310f8b186f7','56d57647-a355-4fbb-9c18-4f765c4337b8','3e2657eb-baad-4653-bd2a-f163b3be6955','Good','dasd - Condition: Good','C:\\Users\\magda\\Desktop\\work\\asset_mngmnt\\server\\uploads\\asset-returns\\pdf-1768763746264-968458413.pdf','2026-01-18 19:15:46','2026-01-18 19:15:46',NULL),('4f616371-7e13-44e3-837b-9ca63658d804','d4b23907-119f-4b8d-8051-6294e4018a5f','3e2657eb-baad-4653-bd2a-f163b3be6955','Good','dsa - Condition: Good','C:\\Users\\magda\\Desktop\\work\\asset_mngmnt\\server\\uploads\\asset-returns\\pdf-1768763700392-834070243.pdf','2026-01-18 19:15:00','2026-01-18 19:15:00',NULL),('b35e989f-69bb-4d31-a486-a6fca63a9a88','684f485f-837d-4015-b4a3-4c1825d3353a','3e2657eb-baad-4653-bd2a-f163b3be6955','Good','dsa - Condition: Good','C:\\Users\\magda\\Desktop\\work\\asset_mngmnt\\server\\uploads\\asset-returns\\pdf-1768763262052-240841855.pdf','2026-01-18 19:07:42','2026-01-18 19:07:42',NULL),('bdb20ff4-f514-47ee-b483-0b3ee1ed812d','54d8ecdf-07e3-4637-ba25-60d9ab9a9833','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','Good','ds - Condition: Good','C:\\Users\\magda\\Desktop\\work\\asset_mngmnt\\server\\uploads\\asset-returns\\pdf-1768766636162-301815402.pdf','2026-01-18 20:03:56','2026-01-18 20:03:56',NULL);
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

-- Dump completed on 2026-02-01 17:10:54
