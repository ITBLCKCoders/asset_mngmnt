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
-- Table structure for table `user_login_attempts`
--

DROP TABLE IF EXISTS `user_login_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_login_attempts` (
  `user_login_attempts_id` char(36) NOT NULL,
  `identifier` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `failed_attempts` int DEFAULT '0',
  `locked_until` datetime DEFAULT NULL,
  `last_attempt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_login_attempts_id`),
  UNIQUE KEY `unique_identifier` (`identifier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_login_attempts`
--

LOCK TABLES `user_login_attempts` WRITE;
/*!40000 ALTER TABLE `user_login_attempts` DISABLE KEYS */;
INSERT INTO `user_login_attempts` VALUES ('19ae7115-3219-7cba-6436-3277371cc9dc','xxfeedes@gmail.com',1,NULL,'2025-12-04 01:54:25'),('19ae7928-e8a3-7ee4-eda1-44d0cdf31343','charlin.infante19@gmail.com',1,NULL,'2025-12-04 04:15:32'),('19ae792b-7548-7bea-59b2-6c9e69f5b279','chenggaykim@gmail.com',1,NULL,'2025-12-15 01:29:00'),('19aed40d-5b5f-7a42-22d5-61d2bc81874a','foryt470@gmail.com',1,NULL,'2025-12-05 06:44:00'),('19b027a6-92ea-7d7c-7e58-120fcb40483f','sarbosaduplin@gmaiol.com',1,NULL,'2025-12-09 09:38:54'),('19b11fdd-a1a6-7ea8-afe8-a48663829219','mag',1,NULL,'2025-12-12 09:56:49'),('19b92cdb-6241-7464-3898-462b2e0518ac','magdalitaryan7@gmail.com ',1,'2026-01-06 18:18:00','2026-01-18 16:36:10'),('19bd2670-fc76-710f-5f89-4f8eb0033e3a','adsads',2,NULL,'2026-01-18 18:38:47'),('19bd27cd-e9a5-70b7-7c7e-6b75ead9add7','dnjaksjnd',2,NULL,'2026-01-18 19:02:36'),('19bd2ab4-1533-7e14-26ec-16c879f25b21','magdalitaryna7@gmail.com',2,NULL,'2026-01-18 19:53:21'),('19bd2b24-0361-7228-a2ac-5263a1df498e','dopeaft69t@gmail.com',1,NULL,'2026-01-18 20:00:57'),('19bfa2bc-7ef2-736e-95df-35f7c502d7df','magdalitaryan7@gmail,com',1,NULL,'2026-01-26 11:58:52'),('19bfac46-4dc2-7c71-fa89-4a4620592918','ryMGDLT',3,NULL,'2026-01-26 14:51:49');
/*!40000 ALTER TABLE `user_login_attempts` ENABLE KEYS */;
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
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `before_insert_user_login_attempts` BEFORE INSERT ON `user_login_attempts` FOR EACH ROW BEGIN
    IF NEW.user_login_attempts_id IS NULL THEN
        SET NEW.user_login_attempts_id = uuid_v7();
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
