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
-- Table structure for table `asset_return_forms`
--

DROP TABLE IF EXISTS `asset_return_forms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_return_forms` (
  `formID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `form_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_room_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `signed_at` datetime DEFAULT NULL,
  `signed_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `signed_digital_signature` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `process_signed_at` datetime DEFAULT NULL,
  `process_digital_signature` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `deleted_at` datetime DEFAULT NULL,
  `return_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `received_by` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dept_head_signed_at` datetime DEFAULT NULL,
  `dept_head_digital_signature` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `dept_head_signed_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `it_manager_signed_at` datetime DEFAULT NULL,
  `it_manager_digital_signature` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `it_manager_signed_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `declined_at` datetime DEFAULT NULL,
  `declined_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `processor_declined_at` datetime DEFAULT NULL,
  `processor_declined_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `processor_decline_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `process_user_position` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `owner_absent` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`formID`),
  UNIQUE KEY `form_number` (`form_number`),
  KEY `idx_asset_return_forms_user_id` (`user_id`),
  KEY `idx_asset_return_forms_created_at` (`created_at`),
  KEY `fk_asset_return_forms_department_id` (`department_id`),
  KEY `fk_asset_return_forms_location_id` (`location_id`),
  KEY `fk_asset_return_forms_location_room_id` (`location_room_id`),
  KEY `fk_asset_return_forms_created_by` (`created_by`),
  KEY `fk_asset_return_forms_signed_by` (`signed_by`),
  KEY `fk_asset_return_forms_dept_head_signed_by` (`dept_head_signed_by`),
  KEY `fk_asset_return_forms_it_manager_signed_by` (`it_manager_signed_by`),
  KEY `idx_arf_declined_by` (`declined_by`),
  KEY `idx_arf_processor_declined_by` (`processor_declined_by`),
  CONSTRAINT `fk_arf_declined_by` FOREIGN KEY (`declined_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_arf_processor_declined_by` FOREIGN KEY (`processor_declined_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_asset_return_forms_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL,
  CONSTRAINT `fk_asset_return_forms_department_id` FOREIGN KEY (`department_id`) REFERENCES `asset_mngmnt_departments` (`departmentID`) ON DELETE SET NULL,
  CONSTRAINT `fk_asset_return_forms_dept_head_signed_by` FOREIGN KEY (`dept_head_signed_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL,
  CONSTRAINT `fk_asset_return_forms_it_manager_signed_by` FOREIGN KEY (`it_manager_signed_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL,
  CONSTRAINT `fk_asset_return_forms_location_id` FOREIGN KEY (`location_id`) REFERENCES `asset_mngmnt_locations` (`locationID`) ON DELETE SET NULL,
  CONSTRAINT `fk_asset_return_forms_location_room_id` FOREIGN KEY (`location_room_id`) REFERENCES `asset_mngmnt_location_rooms` (`roomID`) ON DELETE SET NULL,
  CONSTRAINT `fk_asset_return_forms_signed_by` FOREIGN KEY (`signed_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL,
  CONSTRAINT `fk_asset_return_forms_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`userID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_return_forms`
--

LOCK TABLES `asset_return_forms` WRITE;
/*!40000 ALTER TABLE `asset_return_forms` DISABLE KEYS */;
INSERT INTO `asset_return_forms` VALUES ('1e10d25b-9ded-443f-9afa-848996743322','005-108-1009-052026-0003','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','65abe729-c369-447e-a864-a8e98b74b842','2026-05-22 07:29:59','2026-05-22 07:35:27','2026-05-22 07:34:48','65abe729-c369-447e-a864-a8e98b74b842',NULL,'2026-05-22 07:29:59',NULL,NULL,'Returned','65abe729-c369-447e-a864-a8e98b74b842','2026-05-22 07:35:17','https://res.cloudinary.com/dp0tpwusz/image/upload/v1779370185/user-initials/dmxgw7przm4yerzlpyuv.png','65abe729-c369-447e-a864-a8e98b74b842','2026-05-22 07:35:27',NULL,'65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,NULL,NULL,NULL,'Jr. Full Stack Developer',0),('33e57bc4-bf1b-4317-b60f-8ebb4f82c5be','005-108-1009-052026-0004','86caed5e-b6f8-442a-8423-168d9ad4a579','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','65abe729-c369-447e-a864-a8e98b74b842','2026-05-22 07:39:58','2026-05-22 07:42:57','2026-05-22 07:41:55','86caed5e-b6f8-442a-8423-168d9ad4a579',NULL,'2026-05-22 07:39:58',NULL,NULL,'Returned','65abe729-c369-447e-a864-a8e98b74b842','2026-05-22 07:42:34','https://res.cloudinary.com/dp0tpwusz/image/upload/v1779370185/user-initials/dmxgw7przm4yerzlpyuv.png','65abe729-c369-447e-a864-a8e98b74b842','2026-05-22 07:42:57',NULL,'65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,NULL,NULL,NULL,'Jr. Full Stack Developer',0),('35aa8ca8-e7e9-4de2-b515-6a0134de82ed','005-108-1009-052026-0005','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','65abe729-c369-447e-a864-a8e98b74b842','2026-05-22 07:44:39','2026-05-22 08:11:51','2026-05-22 08:00:00','65abe729-c369-447e-a864-a8e98b74b842','https://res.cloudinary.com/dp0tpwusz/image/upload/v1779370185/user-initials/dmxgw7przm4yerzlpyuv.png','2026-05-22 07:44:39','https://res.cloudinary.com/dp0tpwusz/image/upload/v1779370185/user-initials/dmxgw7przm4yerzlpyuv.png',NULL,'Returned','65abe729-c369-447e-a864-a8e98b74b842','2026-05-22 08:05:07','https://res.cloudinary.com/dp0tpwusz/image/upload/v1779370185/user-initials/dmxgw7przm4yerzlpyuv.png','65abe729-c369-447e-a864-a8e98b74b842','2026-05-22 08:11:51','https://res.cloudinary.com/dp0tpwusz/image/upload/v1779370185/user-initials/dmxgw7przm4yerzlpyuv.png','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,NULL,NULL,NULL,'Jr. Full Stack Developer',0),('7cda296a-966d-4ce0-8313-8babd03378c8','005-108-1009-052026-0001','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','65abe729-c369-447e-a864-a8e98b74b842','2026-05-22 06:55:07','2026-05-22 06:55:07',NULL,NULL,NULL,'2026-05-22 06:55:07',NULL,NULL,'Returned','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Jr. Full Stack Developer',0),('84ed744c-4bae-4857-af6f-0123b8e98842','005-108-1009-052026-0009','86caed5e-b6f8-442a-8423-168d9ad4a579','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','86caed5e-b6f8-442a-8423-168d9ad4a579','2026-05-22 12:48:13','2026-05-22 13:09:17','2026-05-22 12:48:13','86caed5e-b6f8-442a-8423-168d9ad4a579',NULL,'2026-05-22 13:06:32',NULL,NULL,'Transfer','Jr. Full Stack Developer','2026-05-22 12:51:26','https://res.cloudinary.com/dp0tpwusz/image/upload/v1779370185/user-initials/dmxgw7przm4yerzlpyuv.png','65abe729-c369-447e-a864-a8e98b74b842','2026-05-22 13:09:17',NULL,'65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,NULL,NULL,NULL,'Jr. Full Stack Developer',0),('8a7f9053-ad77-4715-a2a4-3e1e4fdd1a9e','005-108-1009-052026-0002','65abe729-c369-447e-a864-a8e98b74b842','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','65abe729-c369-447e-a864-a8e98b74b842','2026-05-22 06:55:50','2026-05-22 06:57:55','2026-05-22 06:56:29','65abe729-c369-447e-a864-a8e98b74b842',NULL,'2026-05-22 06:55:50',NULL,NULL,'Returned','65abe729-c369-447e-a864-a8e98b74b842','2026-05-22 06:57:27','https://res.cloudinary.com/dp0tpwusz/image/upload/v1779370185/user-initials/dmxgw7przm4yerzlpyuv.png','65abe729-c369-447e-a864-a8e98b74b842','2026-05-22 06:57:55',NULL,'65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,NULL,NULL,NULL,'Jr. Full Stack Developer',0),('9b0904e1-4984-4e7a-b810-e9d60766eca1','005-108-1009-052026-0006','86caed5e-b6f8-442a-8423-168d9ad4a579','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','86caed5e-b6f8-442a-8423-168d9ad4a579','2026-05-22 08:20:00','2026-05-22 08:23:52','2026-05-22 08:20:00','86caed5e-b6f8-442a-8423-168d9ad4a579','https://res.cloudinary.com/dp0tpwusz/image/upload/v1777083437/user-initials/inliztjonjoaqsameqij.png','2026-05-22 08:22:25','https://res.cloudinary.com/dp0tpwusz/image/upload/v1779370185/user-initials/dmxgw7przm4yerzlpyuv.png',NULL,'Offboarding','65abe729-c369-447e-a864-a8e98b74b842','2026-05-22 08:21:19','https://res.cloudinary.com/dp0tpwusz/image/upload/v1779370185/user-initials/dmxgw7przm4yerzlpyuv.png','65abe729-c369-447e-a864-a8e98b74b842','2026-05-22 08:23:52','https://res.cloudinary.com/dp0tpwusz/image/upload/v1779370185/user-initials/dmxgw7przm4yerzlpyuv.png','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,NULL,NULL,NULL,'Jr. Full Stack Developer',0),('d05b0a81-f7f9-4845-a641-bf1b2d30a917','005-108-1009-052026-0008','86caed5e-b6f8-442a-8423-168d9ad4a579','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e147580-f4df-11f0-9f53-18c04d003e97','65abe729-c369-447e-a864-a8e98b74b842','2026-05-22 08:59:27','2026-05-22 09:53:11','2026-05-22 09:06:09','86caed5e-b6f8-442a-8423-168d9ad4a579','https://res.cloudinary.com/dp0tpwusz/image/upload/v1777083437/user-initials/inliztjonjoaqsameqij.png','2026-05-22 08:59:27',NULL,NULL,'Transfer',NULL,'2026-05-22 09:52:29','https://res.cloudinary.com/dp0tpwusz/image/upload/v1779370185/user-initials/dmxgw7przm4yerzlpyuv.png','65abe729-c369-447e-a864-a8e98b74b842','2026-05-22 09:53:11','https://res.cloudinary.com/dp0tpwusz/image/upload/v1779370185/user-initials/dmxgw7przm4yerzlpyuv.png','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,NULL,NULL,NULL,NULL,0),('e3b69714-319f-4399-ba18-a043d0d8a3b2','005-108-1009-052026-0010','86caed5e-b6f8-442a-8423-168d9ad4a579','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','86caed5e-b6f8-442a-8423-168d9ad4a579','2026-05-22 13:14:58','2026-05-22 13:14:58','2026-05-22 13:14:58','86caed5e-b6f8-442a-8423-168d9ad4a579',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0),('ec879bd6-65c4-47b3-93d9-cc54e4a6d308','005-108-1009-052026-0007','86caed5e-b6f8-442a-8423-168d9ad4a579','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97','3e1a2643-f4df-11f0-9f53-18c04d003e97','65abe729-c369-447e-a864-a8e98b74b842','2026-05-22 08:31:33','2026-05-22 08:49:47','2026-05-22 08:33:23','86caed5e-b6f8-442a-8423-168d9ad4a579','https://res.cloudinary.com/dp0tpwusz/image/upload/v1777083437/user-initials/inliztjonjoaqsameqij.png','2026-05-22 08:48:57',NULL,NULL,'Transfer','Jr. Full Stack Developer','2026-05-22 08:47:19','https://res.cloudinary.com/dp0tpwusz/image/upload/v1779370185/user-initials/dmxgw7przm4yerzlpyuv.png','65abe729-c369-447e-a864-a8e98b74b842','2026-05-22 08:49:47','https://res.cloudinary.com/dp0tpwusz/image/upload/v1779370185/user-initials/dmxgw7przm4yerzlpyuv.png','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,NULL,NULL,NULL,NULL,0);
/*!40000 ALTER TABLE `asset_return_forms` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-24 14:55:05
