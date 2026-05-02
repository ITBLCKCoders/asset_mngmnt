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
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `users_id` char(36) NOT NULL,
  `firstName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `lastName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `username` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `employeeNumber` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `position` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `contactNumber` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `company` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `department` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `role` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'user',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `refreshToken` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `signature` text,
  `profile_image` text,
  PRIMARY KEY (`users_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `uq_username` (`username`),
  UNIQUE KEY `uq_email` (`email`),
  UNIQUE KEY `uq_employeeNumber` (`employeeNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('19ae6a2e-e328-7c42-2b71-1c9a6c307269','Ryan Rey','Magdalita','ryMGDLT','magdalitaryan7@gmail.com','$2b$10$cPnFUWOE97rV5wWss33B/u1Eh9cJlgoU0cT31YTE0m0LbIu9OUCgO','BCGI-2025-0121','Full Stack Developer','+639272910014','BCGI','IT','admin','2025-12-03 23:53:49','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE5YWU2YTJlLWUzMjgtN2M0Mi0yYjcxLTFjOWE2YzMwNzI2OSIsInVzZXJuYW1lIjoicnlNR0RMVCIsImVtYWlsIjoibWFnZGFsaXRhcnlhbjdAZ21haWwuY29tIiwiZmlyc3ROYW1lIjoiUnlhbiBSZXkiLCJsYXN0TmFtZSI6Ik1hZ2RhbGl0YSIsInJvbGUiOiJhZG1pbiIsImRlcGFydG1lbnQiOiJJVCIsImNvbXBhbnkiOiJCQ0dJIiwiaWF0IjoxNzcwMjgyMTUwLCJleHAiOjE3NzAyODI0NTB9.KplzDDHcY8-hze6i6Jg2wVjbHJ07IWBAX0z8kuPUShI','/uploads/signatures/signature-19ae6a2e-e328-7c42-2b71-1c9a6c307269-1765446974309-101123693.jpg',NULL),('19ae866b-51f2-7ff1-05d3-6f19d975bc67','Mike John','Jovellanos','Mike_John','jovellanosmikejohn@gmail.com','$2b$10$.JR/1QPvYuQA3cR1EFfbv.tUzHNmPeTNyN0NeKXZbZkaYFGgdhFWS','BCGI-2025-0003','Junior Development','+639936599888','BCGI','IT','dept_head','2025-12-04 08:07:16','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE5YWU4NjZiLTUxZjItN2ZmMS0wNWQzLTZmMTlkOTc1YmM2NyIsInVzZXJuYW1lIjoiTWlrZV9Kb2huIiwiZW1haWwiOiJqb3ZlbGxhbm9zbWlrZWpvaG5AZ21haWwuY29tIiwiZmlyc3ROYW1lIjoiTWlrZSBKb2huIiwibGFzdE5hbWUiOiJKb3ZlbGxhbm9zIiwicm9sZSI6ImRlcHRfaGVhZCIsImRlcGFydG1lbnQiOiJJVCIsImNvbXBhbnkiOiJCQ0dJIiwiaWF0IjoxNzY4ODAzNDM3LCJleHAiOjE3Njg4MDM3Mzd9.Z5Iyi7KSb9vibjRD44kRJLwz1GMrJuoswTY5pn0uS6U',NULL,NULL),('19b11217-2a27-7263-40cf-476b776d1dad','Mike John','Bert','mikeeeeeeey23','dopeaf69t@gmail.com','$2b$10$1pXiO5X2xYWC3m6xvEV3seskpcPq10vj7fqoVR4NvKC74ivVtCCiS','BCGI-2000-0221','IT Staff','+639936599888','BCGI','IT','assigned_worker','2025-12-12 05:56:04','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE5YjExMjE3LTJhMjctNzI2My00MGNmLTQ3NmI3NzZkMWRhZCIsInVzZXJuYW1lIjoibWlrZWVlZWVlZXkyMyIsImVtYWlsIjoiZG9wZWFmNjl0QGdtYWlsLmNvbSIsImZpcnN0TmFtZSI6Ik1pa2UgSm9obiIsImxhc3ROYW1lIjoiQmVydCIsInJvbGUiOiJhc3NpZ25lZF93b3JrZXIiLCJkZXBhcnRtZW50IjoiSVQiLCJjb21wYW55IjoiQkNHSSIsImlhdCI6MTc2ODgwMzI3NSwiZXhwIjoxNzY4ODAzNTc1fQ.N7zj3yAurAh67s2bqkNgsXXh1DN8Q-0m834HQOiLcLQ',NULL,NULL),('19b584dd-1b46-7f6e-8113-6d90d7cbb643','Flourence','Claudber','Flourence','sloppydope070908@gmail.com','$2b$10$VCFq/yqGD2C02zXslw6cdesXL9Vp/V2RsfBsNpl4AoGSsTNsDtMV2','CMTH-1231-2232','Junior Development','+639969969999','CMTH','IT','user','2025-12-26 01:37:37','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE5YjU4NGRkLTFiNDYtN2Y2ZS04MTEzLTZkOTBkN2NiYjY0MyIsInVzZXJuYW1lIjoiRmxvdXJlbmNlIiwiZW1haWwiOiJzbG9wcHlkb3BlMDcwOTA4QGdtYWlsLmNvbSIsImZpcnN0TmFtZSI6IkZsb3VyZW5jZSIsImxhc3ROYW1lIjoiQ2xhdWRiZXIiLCJyb2xlIjoidXNlciIsImRlcGFydG1lbnQiOiJJVCIsImNvbXBhbnkiOiJDTVRIIiwiaWF0IjoxNzY5NzYxNzQ4LCJleHAiOjE3Njk3NjIwNDh9.5kKy_hfca6_tAD8TT0AZntqMcHe_r_wkDCaEg8VekOw',NULL,NULL),('19b585bd-3612-73c6-8bc4-7853e8afe14f','IT','Admin','ITadmin','it.support@thecmtholdings.com','$2b$10$rcdKC5wIYAGID56oaX3pWOQH29cxXnnPerg50L9ieYWFEtfE1N6ju','CMTH-0000-0001','Admin','+639969633366','CMTH','IT','admin','2025-12-26 01:52:54','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE5YjU4NWJkLTM2MTItNzNjNi04YmM0LTc4NTNlOGFmZTE0ZiIsInVzZXJuYW1lIjoiSVRhZG1pbiIsImVtYWlsIjoiaXQuc3VwcG9ydEB0aGVjbXRob2xkaW5ncy5jb20iLCJmaXJzdE5hbWUiOiJJVCIsImxhc3ROYW1lIjoiQWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJkZXBhcnRtZW50IjoiSVQiLCJjb21wYW55IjoiQ01USCIsImlhdCI6MTc2ODc5NjM3MCwiZXhwIjoxNzY4Nzk2NjcwfQ.4AJt_3_dQjp3X9sTBe-gdw29rStQoQpESzAnzGWhGh8',NULL,NULL),('19b7c6af-4f15-7384-2c14-ddc240237709','Flaurence','Claudber','Flourence Claudber','xxfeeders@gmail.com','$2b$10$tspqqJSZ4jMdPH4sqvbtSeyPNhWwBezGY5cmXHK9ProwlFHULy9n6','CMTH-2312-3123','Junior Development','+639996996969','CMTH','IT','user','2026-01-02 01:55:42','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE5YjdjNmFmLTRmMTUtNzM4NC0yYzE0LWRkYzI0MDIzNzcwOSIsInVzZXJuYW1lIjoiRmxvdXJlbmNlIENsYXVkYmVyIiwiZW1haWwiOiJ4eGZlZWRlcnNAZ21haWwuY29tIiwiZmlyc3ROYW1lIjoiRmxhdXJlbmNlIiwibGFzdE5hbWUiOiJDbGF1ZGJlciIsInJvbGUiOiJ1c2VyIiwiZGVwYXJ0bWVudCI6IklUIiwiY29tcGFueSI6IkNNVEgiLCJpYXQiOjE3Njc4MzU2NzMsImV4cCI6MTc2NzgzNTk3M30.nc499oiDpFltSdd0o9la3Q7Sa9YiuHd13BMRWNDEZVo',NULL,NULL),('19bd4f70-f141-7652-2601-62db93018b6e','Julius','Libranda','junolibranda','julius.libranda@thecmtholdings.com','$2b$10$iXLztTZz6yEgzE2CNej6BuOzKQs4FO1lqvQ820xeLd8eXJD52/hem','CMTH-2024-0024','Legal Officer','+639171583684','CMTH','Legal','user','2026-01-19 06:35:19','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE5YmQ0ZjcwLWYxNDEtNzY1Mi0yNjAxLTYyZGI5MzAxOGI2ZSIsInVzZXJuYW1lIjoianVub2xpYnJhbmRhIiwiZW1haWwiOiJqdWxpdXMubGlicmFuZGFAdGhlY210aG9sZGluZ3MuY29tIiwiZmlyc3ROYW1lIjoiSnVsaXVzIiwibGFzdE5hbWUiOiJMaWJyYW5kYSIsInJvbGUiOiJ1c2VyIiwiZGVwYXJ0bWVudCI6IkxlZ2FsIiwiY29tcGFueSI6IkNNVEgiLCJpYXQiOjE3Njg4MDQ1NTIsImV4cCI6MTc2ODgwNDg1Mn0.NNVYScBYCi0rkhdKpVgFe5lOv_Ywb973oNt4Fk2pWcM',NULL,NULL),('19c0e24e-708b-794e-96ec-6fa35abfbe8d','Assgined ','Worker','AssignWorkerSample','holdmenow2133@gmail.com','$2b$10$LkVMJsH4mbeK3GNDsp4vjuEvAK29TOhOReR1fVdwY3AJFDEkwd0fC','CMTH-0090-9122','Junior network engineer','+639823817318','CMTH','IT','assigned_worker','2026-01-30 09:03:45',NULL,NULL,NULL),('19c0e2b6-fdd1-7390-23ac-74ae507bd2b9','Department','Account','DepartmentAccountSample','fornowt531@gmail.com','$2b$10$aom0uD.8z.Js7ohRVFVyR.r6AIeiw3N8XncS4PQ37D01WD6HBrmUq','CMTH-9090-2931','IT Manager','+639989897234','CMTH','IT','dept_head','2026-01-30 09:10:51',NULL,NULL,NULL),('19c0e2e0-0326-792c-d4b1-6a275b35a89d','User','ACcount','useraccountCMTH','lookabove49@gmail.com','$2b$10$H/sx9JMhunm8uQV3Aa/Jregrz6n60/Z/juIFSApjRy.alyhanlBze','CMTH-0980-9821','Junior network engineer','+639898739721','CMTH','IT','user','2026-01-30 09:13:45','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE5YzBlMmUwLTAzMjYtNzkyYy1kNGIxLTZhMjc1YjM1YTg5ZCIsInVzZXJuYW1lIjoidXNlcmFjY291bnRDTVRIIiwiZW1haWwiOiJsb29rYWJvdmU0OUBnbWFpbC5jb20iLCJmaXJzdE5hbWUiOiJVc2VyIiwibGFzdE5hbWUiOiJBQ2NvdW50Iiwicm9sZSI6InVzZXIiLCJkZXBhcnRtZW50IjoiSVQiLCJjb21wYW55IjoiQ01USCIsImlhdCI6MTc2OTc2NDU2OSwiZXhwIjoxNzY5NzY0ODY5fQ.d9Pcg9xxXb_fb-w1LySmuvqPUDBqw9bUffwMCvfEpUw',NULL,NULL),('19c0e34c-0413-7db5-3cd1-5ed4540b7b51','Receiver','Account','ReceiverAccount','sarbosaduplin@gmail.com','$2b$10$EFvJP5Qzm5.TVbOhjn63mO4IBupEK1F7KRgMiF.P2Ff1L6hWaFl22','CMTH-0902-1318','Junior software engineer','+639556525212','CMTH','IT','receiver','2026-01-30 09:21:07','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE5YzBlMzRjLTA0MTMtN2RiNS0zY2QxLTVlZDQ1NDBiN2I1MSIsInVzZXJuYW1lIjoiUmVjZWl2ZXJBY2NvdW50IiwiZW1haWwiOiJzYXJib3NhZHVwbGluQGdtYWlsLmNvbSIsImZpcnN0TmFtZSI6IlJlY2VpdmVyIiwibGFzdE5hbWUiOiJBY2NvdW50Iiwicm9sZSI6InJlY2VpdmVyIiwiZGVwYXJ0bWVudCI6IklUIiwiY29tcGFueSI6IkNNVEgiLCJpYXQiOjE3Njk3NjQ5MjcsImV4cCI6MTc2OTc2NTIyN30._G2Dx-3H_GSl4ZomRoY0swpJiujRgIbFqgN2S7Wx35o',NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
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
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `before_insert_users` BEFORE INSERT ON `users` FOR EACH ROW BEGIN
    IF NEW.users_id IS NULL THEN
        SET NEW.users_id = uuid_v7();
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

-- Dump completed on 2026-03-09  7:41:48
