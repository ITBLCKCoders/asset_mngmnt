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
-- Table structure for table `asset_assignments`
--

DROP TABLE IF EXISTS `asset_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_assignments` (
  `assignmentID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `asset_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_room_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `expected_return_date` datetime DEFAULT NULL,
  `actual_return_date` datetime DEFAULT NULL,
  `assignment_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('Active','Inactive','Returned','Lost','Damaged') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Active',
  `assigned_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`assignmentID`),
  KEY `asset_id` (`asset_id`),
  KEY `user_id` (`user_id`),
  KEY `department_id` (`department_id`),
  KEY `location_id` (`location_id`),
  KEY `location_room_id` (`location_room_id`),
  KEY `assigned_by` (`assigned_by`),
  CONSTRAINT `asset_assignments_ibfk_1` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`assetID`) ON DELETE CASCADE,
  CONSTRAINT `asset_assignments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`userID`) ON DELETE CASCADE,
  CONSTRAINT `asset_assignments_ibfk_3` FOREIGN KEY (`department_id`) REFERENCES `asset_mngmnt_departments` (`departmentID`) ON DELETE SET NULL,
  CONSTRAINT `asset_assignments_ibfk_4` FOREIGN KEY (`location_id`) REFERENCES `asset_mngmnt_locations` (`locationID`) ON DELETE SET NULL,
  CONSTRAINT `asset_assignments_ibfk_5` FOREIGN KEY (`location_room_id`) REFERENCES `asset_mngmnt_location_rooms` (`roomID`) ON DELETE SET NULL,
  CONSTRAINT `asset_assignments_ibfk_6` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_assignments`
--

LOCK TABLES `asset_assignments` WRITE;
/*!40000 ALTER TABLE `asset_assignments` DISABLE KEYS */;
INSERT INTO `asset_assignments` VALUES ('0035b610-aee4-4b47-82e7-5e9c977868da','bc7df56f-ecf2-11f0-b486-18c04d003e97','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-12 14:14:58',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-12 14:14:58','2026-01-12 14:14:58',NULL),('04c4c02a-6a2e-4dfb-9746-2bd529028b05','dc108956-ecf2-11f0-b486-18c04d003e97','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-12 13:56:49',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-12 13:56:49','2026-01-12 13:56:49',NULL),('07cee3ff-9d3a-4716-990c-00c6e2217f0e','990b082a-ecf0-11f0-b486-18c04d003e97','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-14 13:24:15',NULL,NULL,'Assigned via asset issuance','Active','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','2026-01-14 13:24:15','2026-01-14 13:24:15',NULL),('0ce69d46-ae71-4af8-bf0e-174cc3084aa3','6644a010-ecf3-11f0-b486-18c04d003e97','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-12 13:56:49',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-12 13:56:49','2026-01-12 13:56:49',NULL),('107affe7-41ea-498c-b5cd-4b7d3dcb1001','71bcb7e6-ed01-11f0-b486-18c04d003e97','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-12 08:48:02',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-12 08:48:02','2026-01-12 08:48:02',NULL),('19a0adcc-0964-448c-a6c0-042179088cb2','6ce0929f-ecf2-11f0-b486-18c04d003e97','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-14 10:55:44',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-14 10:55:44','2026-01-14 10:55:44',NULL),('1bc8d2e7-c5a7-4455-bd01-8ec1127b88f3','7ceef230-ecfc-11f0-b486-18c04d003e97','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-12 13:39:35',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-12 13:39:35','2026-01-12 13:39:35',NULL),('254d01d2-5d6e-4169-8775-8b6fa31cd368','d5ea56ad-ecfd-11f0-b486-18c04d003e97','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-12 13:39:35',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-12 13:39:35','2026-01-12 13:39:35',NULL),('2620fcbf-e7e4-4db9-9a10-cdab3dbdf21b','84ba6b00-ecf0-11f0-b486-18c04d003e97','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-14 13:24:15',NULL,NULL,'Assigned via asset issuance','Active','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','2026-01-14 13:24:15','2026-01-14 13:24:15',NULL),('2c437883-a831-4d11-90cd-146f04962e58','dc52a652-ecfe-11f0-b486-18c04d003e97','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-12 09:15:59',NULL,NULL,'Assigned via asset issuance','Active','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','2026-01-12 09:15:59','2026-01-12 09:15:59',NULL),('3336cca0-3141-42a6-9a88-98ada00ff42e','1e824b8a-ecff-11f0-b486-18c04d003e97','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-12 09:16:00',NULL,NULL,'Assigned via asset issuance','Active','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','2026-01-12 09:16:00','2026-01-12 09:16:00',NULL),('3dad3001-f40e-4a08-98ca-970ec273a559','1875a4b8-ecf1-11f0-b486-18c04d003e97','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-14 11:12:19',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-14 11:12:19','2026-01-14 11:12:19',NULL),('53398455-20ba-4e5a-8cc5-d30ad3552c94','5c9e788d-ecfc-11f0-b486-18c04d003e97','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-12 13:39:35',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-12 13:39:35','2026-01-12 13:39:35',NULL),('66f67c3d-97d2-4613-9287-492cdf68f48c','95191b6e-ecfc-11f0-b486-18c04d003e97','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-12 13:39:35',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-12 13:39:35','2026-01-12 13:39:35',NULL),('7625e38d-8612-4073-9462-769a5fea961e','19bc6d1f-ecf3-11f0-b486-18c04d003e97','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-12 13:56:49',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-12 13:56:49','2026-01-12 13:56:49',NULL),('79ea902e-afad-4ac6-8705-2b641968ec2b','99ca6288-ecf2-11f0-b486-18c04d003e97','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-12 14:14:59',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-12 14:14:59','2026-01-12 14:14:59',NULL),('7a63ed24-d563-4f49-8164-7bd840c92e10','7f1db355-ecf3-11f0-b486-18c04d003e97','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-12 13:51:13',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-12 13:51:13','2026-01-12 13:51:13',NULL),('7ef9c078-18a0-4f93-9093-bcc3a2bd971a','30c1640a-ecf1-11f0-b486-18c04d003e97','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-14 10:55:45',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-14 10:55:45','2026-01-14 10:55:45',NULL),('852060e8-4f17-43ae-854f-dca465b393df','38e1e524-ecfc-11f0-b486-18c04d003e97','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-12 13:51:13',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-12 13:51:13','2026-01-12 13:51:13',NULL),('863ca199-43da-4438-bf18-8c48a2f8c3eb','cf943166-ecf0-11f0-b486-18c04d003e97','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-14 13:16:43',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-14 13:16:43','2026-01-14 13:16:43',NULL),('9470800e-f0e8-4084-969d-b660de0c3ed3','f06e111d-ecf0-11f0-b486-18c04d003e97','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-14 11:12:19',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-14 11:12:19','2026-01-14 11:12:19',NULL),('969f48d1-0523-4ae7-a7cb-153a2291ff4d','f7926e8e-ecf2-11f0-b486-18c04d003e97','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-12 13:56:49',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-12 13:56:49','2026-01-12 13:56:49',NULL),('9c13cdbe-abbb-4f06-88df-62a799191de1','bba87d70-ecf0-11f0-b486-18c04d003e97','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-14 13:16:44',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-14 13:16:44','2026-01-14 13:16:44',NULL),('9e8deddb-8a9f-4cf8-b3a5-cae3a749cf5a','c133758c-ecfe-11f0-b486-18c04d003e97','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-12 09:15:59',NULL,NULL,'Assigned via asset issuance','Active','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','2026-01-12 09:15:59','2026-01-12 09:15:59',NULL),('ae690353-60cf-42b0-b8f4-5b30888703fd','84ff86b5-ed01-11f0-b486-18c04d003e97','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-12 08:48:01',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-12 08:48:01','2026-01-12 08:48:01',NULL),('b0875f4a-fd97-4a77-9206-4cd1752cc71c','8754cbc7-ecf2-11f0-b486-18c04d003e97','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-12 14:14:59',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-12 14:14:59','2026-01-12 14:14:59',NULL),('b1b5bed6-d8a2-4182-9886-f781b1b5ba7a','5bc22848-ecf0-11f0-b486-18c04d003e97','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-14 13:24:15',NULL,NULL,'Assigned via asset issuance','Active','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','2026-01-14 13:24:15','2026-01-14 13:24:15',NULL),('b276ae44-1b89-436c-ae52-3759d12a04d4','453b8a93-ed00-11f0-b486-18c04d003e97','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','2026-01-12 08:53:19',NULL,NULL,'Assigned via asset issuance','Active','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','2026-01-12 08:53:19','2026-01-12 08:53:19',NULL),('b9e2091d-839d-432e-8caf-2b79bb626174','613c53db-ed00-11f0-b486-18c04d003e97','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','2026-01-12 08:53:18',NULL,NULL,'Assigned via asset issuance','Active','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','2026-01-12 08:53:18','2026-01-12 08:53:18',NULL),('bb68c92b-9423-495f-ab24-2fbfcbd10bcd','ae8b18f1-ecfe-11f0-b486-18c04d003e97','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-12 09:16:00',NULL,NULL,'Assigned via asset issuance','Active','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','2026-01-12 09:16:00','2026-01-12 09:16:00',NULL),('bf09dbef-b144-4c37-a448-e10de04df89e','25b235c7-ecfc-11f0-b486-18c04d003e97','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-12 13:51:13',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-12 13:51:13','2026-01-12 13:51:13',NULL),('c01dc49a-f9a6-4e8e-bd2c-8dc991471702','0813d6fb-ecf1-11f0-b486-18c04d003e97','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-14 11:12:19',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-14 11:12:19','2026-01-14 11:12:19',NULL),('c134cd6c-d524-4de7-af27-3ff4f4638037','4a49c251-ecfc-11f0-b486-18c04d003e97','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-12 13:39:36',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-12 13:39:36','2026-01-12 13:39:36',NULL),('c58b1556-9117-4d2e-b201-2e7caaae35e8','3e3d1856-ecf3-11f0-b486-18c04d003e97','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-12 13:56:49',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-12 13:56:49','2026-01-12 13:56:49',NULL),('c6ed5492-ba8e-4410-b9ef-fb6f7df93eba','56b28065-ecf2-11f0-b486-18c04d003e97','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-14 10:55:44',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-14 10:55:44','2026-01-14 10:55:44',NULL),('d05f4fcb-da72-48a7-84c6-428e77f34b1d','aa3a4ecc-ecf0-11f0-b486-18c04d003e97','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-14 13:16:44',NULL,NULL,'Assigned via asset issuance','Active','65abe729-c369-447e-a864-a8e98b74b842','2026-01-14 13:16:44','2026-01-14 13:16:44',NULL),('e3207ba2-76c7-4163-beb0-facaa3e28d2a','fba1a0ba-ecfe-11f0-b486-18c04d003e97','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','883f41b8-da55-11f0-a44e-18c04d003e97','2026-01-12 09:16:00',NULL,NULL,'Assigned via asset issuance','Active','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','2026-01-12 09:16:00','2026-01-12 09:16:00',NULL),('e7074268-311f-4314-8914-d7fc9288aa6f','5a02f688-ed01-11f0-b486-18c04d003e97','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','88417964-da55-11f0-a44e-18c04d003e97','2026-01-12 08:53:16',NULL,NULL,'Assigned via asset issuance','Active','452bbdf6-0760-4e2b-9175-4dc28ef11bb4','2026-01-12 08:53:16','2026-01-12 08:53:16',NULL);
/*!40000 ALTER TABLE `asset_assignments` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_after_asset_assignment_insert` AFTER INSERT ON `asset_assignments` FOR EACH ROW BEGIN
    DECLARE v_asset_name VARCHAR(255);
    DECLARE v_asset_code VARCHAR(255);
    DECLARE v_assigned_by_name VARCHAR(255);
    DECLARE v_message TEXT;
    
    -- Get asset details
    SELECT a.name, a.asset_code INTO v_asset_name, v_asset_code
    FROM assets a
    WHERE a.assetID = NEW.asset_id;
    
    -- Get assigned by user name
    SELECT CONCAT(u.first_name, ' ', u.last_name) INTO v_assigned_by_name
    FROM users u
    WHERE u.userID = NEW.assigned_by;
    
    -- Create notification message
    SET v_message = CONCAT('You have been assigned asset ', v_asset_code, ' by ', v_assigned_by_name);
    
    -- Insert notification
    INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        data
    ) VALUES (
        NEW.user_id,
        'New Asset Assignment',
        v_message,
        'asset_assignment',
        JSON_OBJECT(
            'assetId', NEW.asset_id,
            'assetCode', v_asset_code,
            'assetName', v_asset_name,
            'assignedAt', NEW.assigned_date,
            'assignedBy', JSON_OBJECT(
                'id', NEW.assigned_by,
                'name', v_assigned_by_name
            )
        )
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-19  7:18:39
