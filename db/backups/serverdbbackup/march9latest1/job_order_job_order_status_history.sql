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
-- Table structure for table `job_order_status_history`
--

DROP TABLE IF EXISTS `job_order_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_order_status_history` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `job_orders_id` char(36) NOT NULL,
  `job_order_id` varchar(50) NOT NULL,
  `changed_by_id` char(36) NOT NULL,
  `changed_by_name` varchar(255) NOT NULL,
  `old_status` enum('draft','pending','approved','received','in_progress','action_done','completed','declined','assigned','ongoing','waiting_confirmation','acknowledged','complete') DEFAULT NULL,
  `new_status` enum('draft','pending','approved','received','in_progress','action_done','completed','declined','assigned','ongoing','waiting_confirmation','acknowledged','complete') NOT NULL,
  `message` text,
  `changed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_job_orders_id` (`job_orders_id`),
  KEY `idx_changed_at` (`changed_at`),
  KEY `idx_new_status` (`new_status`),
  KEY `idx_changed_by` (`changed_by_id`),
  CONSTRAINT `fk_status_history_job_orders` FOREIGN KEY (`job_orders_id`) REFERENCES `job_orders` (`job_orders_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_order_status_history`
--

LOCK TABLES `job_order_status_history` WRITE;
/*!40000 ALTER TABLE `job_order_status_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_order_status_history` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-09  7:41:50
