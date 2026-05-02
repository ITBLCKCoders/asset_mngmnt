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
-- Table structure for table `job_order_attachments`
--

DROP TABLE IF EXISTS `job_order_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_order_attachments` (
  `job_order_attachments_id` char(36) NOT NULL,
  `job_orders_id` char(36) NOT NULL,
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `file_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `file_size` bigint DEFAULT NULL,
  `file_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`job_order_attachments_id`),
  KEY `fk_job_order_attachments_job_orders` (`job_orders_id`),
  CONSTRAINT `fk_job_order_attachments_job_orders` FOREIGN KEY (`job_orders_id`) REFERENCES `job_orders` (`job_orders_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_order_attachments`
--

LOCK TABLES `job_order_attachments` WRITE;
/*!40000 ALTER TABLE `job_order_attachments` DISABLE KEYS */;
INSERT INTO `job_order_attachments` VALUES ('19bfa628-2ff1-7dc1-bcd7-2dee866cb7ba','19bf959d-c107-73d7-f069-169c201e5a70','BCGI_IT_job_orders (12).pdf','1769414963798-vws132ha1.pdf','/api/job-orders/uploads/1769414963798-vws132ha1.pdf',9388412,'application/pdf','2026-01-26 12:58:39'),('19c0683c-865f-7f38-2eb3-47629fb51d8a','19c0683c-9bf8-7b45-b1e4-e9558ce3a556','Bert_CMTH_IT_005-108-1000-012026-0002.pdf','1769635803135-6r0sk28b3.pdf','/api/job-orders/uploads/1769635803135-6r0sk28b3.pdf',5636,'application/pdf','2026-01-28 21:30:26'),('19c0e0d0-c98c-7692-b143-166e20dc59b8','19bf9b72-585b-721a-9f38-195ab8d2656a','Job_Orders_Bulk_2026-01-26.xlsx','1769421084603-mp1dkib61.xlsx','/api/job-orders/uploads/1769421084603-mp1dkib61.xlsx',20938,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','2026-01-30 08:37:43');
/*!40000 ALTER TABLE `job_order_attachments` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `before_insert_job_order_attachments` BEFORE INSERT ON `job_order_attachments` FOR EACH ROW BEGIN
    IF NEW.job_order_attachments_id IS NULL THEN
        SET NEW.job_order_attachments_id = uuid_v7();
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

-- Dump completed on 2026-03-09  7:41:49
