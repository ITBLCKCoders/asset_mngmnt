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
INSERT INTO `transfer_form_assignments` VALUES ('2148dd20-7b4f-4da9-9149-41e2d3d4f2d1','488c0007-3941-4287-a36b-70ff2a46d020','2026-06-09 16:19:25','Good','',NULL),('2148dd20-7b4f-4da9-9149-41e2d3d4f2d1','4e70abc9-45d9-40aa-86b0-05fc40cbbc21','2026-06-09 16:19:25','Good','',NULL),('2148dd20-7b4f-4da9-9149-41e2d3d4f2d1','6dbb5a6f-26bc-4358-8f25-132314d84e00','2026-06-09 16:19:25','Good','',NULL),('2148dd20-7b4f-4da9-9149-41e2d3d4f2d1','b398aa07-5ecf-4f96-8492-b1ffa0888537','2026-06-09 16:19:25','Good','',NULL),('2148dd20-7b4f-4da9-9149-41e2d3d4f2d1','c8b441d9-a182-4b23-8974-4ff5ae2b3eb4','2026-06-09 16:19:25','Good','',NULL),('2148dd20-7b4f-4da9-9149-41e2d3d4f2d1','e0a1aa30-4dd4-45c3-9577-d3830a3f4819','2026-06-09 16:19:25','Good','',NULL),('2148dd20-7b4f-4da9-9149-41e2d3d4f2d1','e11fa09a-33ca-4011-9e5c-0113bd66de76','2026-06-09 16:19:25','Good','',NULL),('2c91942b-7b32-4d9b-8a9b-a78fe138b9f5','0f80227e-0fa1-48d1-b43c-45e969c960e3','2026-06-24 15:03:38',NULL,NULL,NULL),('2c91942b-7b32-4d9b-8a9b-a78fe138b9f5','33067412-8362-4ce3-a7d2-51542ea53f1c','2026-06-24 15:03:38',NULL,NULL,NULL),('2c91942b-7b32-4d9b-8a9b-a78fe138b9f5','9ad27813-5d34-4860-9136-3a7cb56208ee','2026-06-24 15:03:38',NULL,NULL,NULL),('2c91942b-7b32-4d9b-8a9b-a78fe138b9f5','a83101da-e1b8-4e15-9c0f-3624cb050fe5','2026-06-24 15:03:38',NULL,NULL,NULL),('2c91942b-7b32-4d9b-8a9b-a78fe138b9f5','bd28ca38-7d2c-41bb-be66-45f99c07c908','2026-06-24 15:03:38',NULL,NULL,NULL),('2c91942b-7b32-4d9b-8a9b-a78fe138b9f5','dccea7bf-e209-4ca2-9c18-fc3709594dc4','2026-06-24 15:03:38',NULL,NULL,NULL),('5b2bb992-d57f-4797-a2f2-f7ec0d6118c6','055140d3-4f37-4bd0-b63f-568329c7bba5','2026-07-03 15:34:06',NULL,NULL,NULL),('5b2bb992-d57f-4797-a2f2-f7ec0d6118c6','0c1b1a4d-df6d-4469-aebe-08fc0d714c11','2026-07-03 15:34:06',NULL,NULL,NULL),('5b2bb992-d57f-4797-a2f2-f7ec0d6118c6','0ef47f9b-9844-4319-adee-411b5f25c2ef','2026-07-03 15:34:06',NULL,NULL,NULL),('5b2bb992-d57f-4797-a2f2-f7ec0d6118c6','54129fae-e4ba-4e6b-b628-7e79de4df444','2026-07-03 15:34:06',NULL,NULL,NULL),('5b2bb992-d57f-4797-a2f2-f7ec0d6118c6','5cead77d-0e56-4de1-981e-d0b4f58a9e8c','2026-07-03 15:34:06',NULL,NULL,NULL),('5b2bb992-d57f-4797-a2f2-f7ec0d6118c6','5f12e957-42ee-4138-b01b-7e5fcf87565c','2026-07-03 15:34:06',NULL,NULL,NULL),('5b2bb992-d57f-4797-a2f2-f7ec0d6118c6','6122fddb-f5ef-4ff8-89ab-b9d2f90f0048','2026-07-03 15:34:06',NULL,NULL,NULL),('5b2bb992-d57f-4797-a2f2-f7ec0d6118c6','a69e99d1-eb74-45ec-ba6f-e6091cfeb398','2026-07-03 15:34:06',NULL,NULL,NULL),('e5d129e2-68cd-44e3-854c-04d8cad98f3a','2a149201-4d19-4314-ba03-500718320a49','2026-05-28 07:46:11','Good','',NULL),('e5d129e2-68cd-44e3-854c-04d8cad98f3a','540f9cee-aa7e-41a2-bbaf-0da489c23c57','2026-05-28 07:46:11','Good','',NULL),('e5d129e2-68cd-44e3-854c-04d8cad98f3a','9a88ea76-3173-4e84-95bd-2257fdbd5c1e','2026-05-28 07:46:11','Good','',NULL),('e5d129e2-68cd-44e3-854c-04d8cad98f3a','cab28d12-bb05-4349-b6c8-42f5d1eff544','2026-05-28 07:46:11','Good','',NULL),('e5d129e2-68cd-44e3-854c-04d8cad98f3a','d9f136b3-0593-4198-9782-5b6226848a09','2026-05-28 07:46:11','Good','',NULL),('e5d129e2-68cd-44e3-854c-04d8cad98f3a','da65d4b4-faf2-457b-8ad0-7a194fada404','2026-05-28 07:46:11','Good','',NULL);
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

-- Dump completed on 2026-07-06 10:22:17
