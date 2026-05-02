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
-- Table structure for table `job_orders`
--

DROP TABLE IF EXISTS `job_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_orders` (
  `job_orders_id` char(36) NOT NULL,
  `job_order_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `requestor` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `requestor_department` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'Unspecified',
  `requestor_company` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'Unspecified',
  `requestor_email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `requestor_contact_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'N/A',
  `company` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `department` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `billed_to` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `date_needed` date DEFAULT NULL,
  `subject` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `categories` json NOT NULL,
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `decline_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `declined_by_id` char(36) DEFAULT NULL,
  `declined_at` datetime DEFAULT NULL,
  `approved_by_id` char(36) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `approver_remarks` text COMMENT 'Remarks from the approver during approval process',
  `assigned_to_id` char(36) DEFAULT NULL,
  `assigned_by_id` char(36) DEFAULT NULL,
  `assignment_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `received_at` datetime DEFAULT NULL,
  `received_by_id` char(36) DEFAULT NULL COMMENT 'User ID of the person who received the job order',
  `receiver_remarks` text COMMENT 'Remarks from the receiver during receiving process',
  `action_done_at` datetime DEFAULT NULL,
  `action_done_by_id` char(36) DEFAULT NULL COMMENT 'User ID of person who marked job as done',
  `action_done_by_name` varchar(255) DEFAULT NULL,
  `action_done_remarks` text COMMENT 'Remarks when marking job as done',
  `acknowledged_at` datetime DEFAULT NULL,
  `acknowledged_by_id` char(36) DEFAULT NULL COMMENT 'User ID of person who acknowledged',
  `acknowledged_remarks` text COMMENT 'Remarks when acknowledging completion',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `date_submitted` date NOT NULL,
  `status` enum('draft','pending','approved','received','in_progress','action_done','completed','declined','assigned','ongoing','waiting_confirmation','acknowledged','complete') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `requestor_position` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`job_orders_id`),
  UNIQUE KEY `job_order_id` (`job_order_id`),
  KEY `idx_status` (`status`),
  KEY `idx_date_needed` (`date_needed`),
  KEY `idx_requestor` (`requestor`),
  KEY `idx_deleted_at` (`deleted_at`),
  KEY `idx_assigned_to_id` (`assigned_to_id`),
  KEY `idx_assigned_by_id` (`assigned_by_id`),
  KEY `fk_job_orders_approved_by` (`approved_by_id`),
  KEY `fk_job_orders_declined_by` (`declined_by_id`),
  KEY `fk_job_orders_assigned_to` (`assigned_to_id`),
  KEY `fk_job_orders_assigned_by` (`assigned_by_id`),
  KEY `idx_received_by_id` (`received_by_id`),
  KEY `idx_approver_remarks` (`approver_remarks`(100)),
  KEY `idx_receiver_remarks` (`receiver_remarks`(100)),
  KEY `idx_job_orders_action_done_by_id` (`action_done_by_id`),
  KEY `idx_job_orders_acknowledged_by_id` (`acknowledged_by_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_orders`
--

LOCK TABLES `job_orders` WRITE;
/*!40000 ALTER TABLE `job_orders` DISABLE KEYS */;
INSERT INTO `job_orders` VALUES ('19bf959d-c107-73d7-f069-169c201e5a70','005-108-1000-012026-0001','Mike John Jovellanos','IT','BCGI','jovellanosmikejohn@gmail.com','+639936599888','CMTH','IT','IT','2026-01-26','printer problem','need to diagnose my printer since the printing doesn\'t working','[\"tech-support\"]','please fix it ',NULL,NULL,NULL,'19ae6a2e-e328-7c42-2b71-1c9a6c307269','2026-01-26 17:18:49','ok ','19bf99f5-57e4-74ec-8235-66c86aa39b21','19ae6a2e-e328-7c42-2b71-1c9a6c307269','kmlkml','2026-01-26 20:58:33','19ae6a2e-e328-7c42-2b71-1c9a6c307269','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-26','assigned','2026-01-26 08:09:32','2026-01-26 12:58:39',NULL,'Unspecified'),('19bf99b9-ae54-7fc3-e252-673bc3379cef','005-108-1000-012026-0002','Mike John Bert','IT','BCGI','dopeaf69t@gmail.com','+639936599888','CMTH','IT','IT','2026-01-26','ojdjaosj','ndbasbadasdasd','[\"data-mgmt\"]','asdadsad',NULL,NULL,NULL,'19ae866b-51f2-7ff1-05d3-6f19d975bc67','2026-01-26 17:22:07','ksdalsld','19bf99f5-57e4-74ec-8235-66c86aa39b21','19b7c6af-4f15-7384-2c14-ddc240237709','fix it','2026-01-26 17:23:44','19b7c6af-4f15-7384-2c14-ddc240237709','','2026-01-26 17:27:20','19bf99f5-57e4-74ec-8235-66c86aa39b21',NULL,NULL,'2026-01-26 17:28:06',NULL,NULL,'2026-01-26','2026-01-26','2026-01-26 17:29:16','2026-01-26','complete','2026-01-26 09:21:23','2026-01-26 09:29:16',NULL,'Unspecified'),('19bf9b72-585b-721a-9f38-195ab8d2656a','005-108-1000-012026-0003','Mike John Bert','IT','BCGI','dopeaf69t@gmail.com','+639936599888','CMTH','IT','IT','2026-01-26','kadlakdnkadlka','kajndskajnkdsja','[\"tech-support\"]','asdkajdkand',NULL,NULL,NULL,'19ae866b-51f2-7ff1-05d3-6f19d975bc67','2026-01-26 17:51:44','ok','19bf99f5-57e4-74ec-8235-66c86aa39b21','19b7c6af-4f15-7384-2c14-ddc240237709','sjdandska','2026-01-26 18:54:26','19b7c6af-4f15-7384-2c14-ddc240237709','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-31','2026-01-31',NULL,'2026-01-26','ongoing','2026-01-26 09:51:27','2026-01-30 08:37:43',NULL,'Unspecified'),('19bfa040-c85a-78a1-599a-ff1304c3fc4c','002-108-1000-012026-0001','Mike John Bert','IT','BCGI','dopeaf69t@gmail.com','+639936599888','BCGI','IT','IT','2026-01-26','jnaksjnkansdakdnaks','kjnakdsjakjdskadskn','[\"tech-support\"]','knjakdsjadsjadsnjkadns',NULL,NULL,NULL,'19ae866b-51f2-7ff1-05d3-6f19d975bc67','2026-01-26 19:16:27','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-26','approved','2026-01-26 11:15:25','2026-01-26 11:16:27',NULL,'Unspecified'),('19bfa21b-96cc-7c45-1190-5cef8bfd73be','002-108-1000-012026-0002','Mike John Jovellanos','IT','BCGI','jovellanosmikejohn@gmail.com','+639936599888','BCGI','IT','IT','2026-01-26','fafsafsa','jhkjhfkjhaksfhjakhsfhafks','[\"tech-support\"]','fasfafsafafsa',NULL,NULL,NULL,'19ae866b-51f2-7ff1-05d3-6f19d975bc67','2026-01-26 20:20:56','','19bf99f5-57e4-74ec-8235-66c86aa39b21','19ae6a2e-e328-7c42-2b71-1c9a6c307269','dasdads','2026-01-28 08:41:51','19ae6a2e-e328-7c42-2b71-1c9a6c307269','',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-26','assigned','2026-01-26 11:47:54','2026-01-28 00:41:58',NULL,'Unspecified'),('19c0683c-9bf8-7b45-b1e4-e9558ce3a556','005-108-1000-012026-0004','Mike John Bert','IT','BCGI','dopeaf69t@gmail.com','+639936599888','CMTH','IT','IT','2026-01-29','Testing ','testing testing','[\"tech-support\"]','testing testing ',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-29','pending','2026-01-28 21:30:26','2026-01-28 21:30:26',NULL,'Unspecified');
/*!40000 ALTER TABLE `job_orders` ENABLE KEYS */;
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
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `before_insert_job_orders` BEFORE INSERT ON `job_orders` FOR EACH ROW BEGIN
    IF NEW.job_orders_id IS NULL THEN
        SET NEW.job_orders_id = uuid_v7();
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
