CREATE DATABASE  IF NOT EXISTS `job_order` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `job_order`;
-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: job_order
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
-- Table structure for table `job_orders_department`
--

DROP TABLE IF EXISTS `job_orders_department`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_orders_department` (
  `job_orders_department_id` char(36) NOT NULL,
  `department_name` varchar(100) NOT NULL,
  `department_code` varchar(50) NOT NULL,
  `company_id` char(36) NOT NULL,
  `head_of_department_id` char(36) DEFAULT NULL,
  `description` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`job_orders_department_id`),
  UNIQUE KEY `uq_department_code` (`department_code`),
  UNIQUE KEY `uq_department_name_company` (`department_name`,`company_id`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_head_of_department_id` (`head_of_department_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_department_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`companies_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_department_head` FOREIGN KEY (`head_of_department_id`) REFERENCES `users` (`users_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_orders_department`
--

LOCK TABLES `job_orders_department` WRITE;
/*!40000 ALTER TABLE `job_orders_department` DISABLE KEYS */;
INSERT INTO `job_orders_department` VALUES ('19b01709-16e0-790e-9022-259289e4964a','Admin','ADMIN','19b01709-28c9-7ac2-e28f-5aa00c776a80',NULL,'Administrative Department',1,'2025-12-09 04:48:36','2025-12-09 04:48:36',NULL),('19b01709-38c7-7a80-9e18-134d07104d34','IT','IT','19b01709-28c9-7ac2-e28f-5aa00c776a80',NULL,'Information Technology Department',1,'2025-12-09 04:48:36','2025-12-09 04:48:36',NULL),('19b01709-bcdd-7559-759d-f1dcfde3c773','Marketing','MKTG','19b01709-28c9-7ac2-e28f-5aa00c776a80',NULL,'Marketing Department',1,'2025-12-09 04:48:36','2025-12-09 04:48:36',NULL),('19b01709-de4b-7b08-d812-1bd0e0206f43','Legal','LEGAL','19b01709-28c9-7ac2-e28f-5aa00c776a80',NULL,'Legal Department handling all legal matters',1,'2025-12-09 04:48:36','2025-12-09 04:48:36',NULL);
/*!40000 ALTER TABLE `job_orders_department` ENABLE KEYS */;
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
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `before_insert_job_orders_department` BEFORE INSERT ON `job_orders_department` FOR EACH ROW BEGIN
    IF NEW.job_orders_department_id IS NULL THEN
        SET NEW.job_orders_department_id = uuid_v7();
    END IF;
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

-- Dump completed on 2026-03-09  7:41:50
