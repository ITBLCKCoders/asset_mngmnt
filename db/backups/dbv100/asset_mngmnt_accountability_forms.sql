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
-- Table structure for table `accountability_forms`
--

DROP TABLE IF EXISTS `accountability_forms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accountability_forms` (
  `formID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `form_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `assignment_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `asset_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_room_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('Pending','Signed','Completed','Revoked','Disabled','Declined') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Pending',
  `decline_reason` text COLLATE utf8mb4_unicode_ci,
  `acknowledgments` json DEFAULT NULL COMMENT 'Contains user signature and other acknowledgment data (NOT issuer signature)',
  `issuer_signature` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `it_copy_signature` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `received_copy_201_file_signature` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `received_copy_201_file_signed_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assets_data` json DEFAULT NULL COMMENT 'Contains asset information for accountability forms',
  `signed_at` datetime DEFAULT NULL,
  `signed_ip` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `signed_user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `received_copy_201_file_signed_by_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `received_copy_201_file_signed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`formID`),
  UNIQUE KEY `form_number` (`form_number`),
  KEY `asset_id` (`asset_id`),
  KEY `user_id` (`user_id`),
  KEY `department_id` (`department_id`),
  KEY `location_id` (`location_id`),
  KEY `location_room_id` (`location_room_id`),
  KEY `created_by` (`created_by`),
  KEY `accountability_forms_ibfk_1` (`assignment_id`),
  KEY `idx_accountability_forms_issuer_signature` (`issuer_signature`(255)),
  CONSTRAINT `accountability_forms_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `asset_assignments` (`assignmentID`) ON DELETE CASCADE,
  CONSTRAINT `accountability_forms_ibfk_2` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`assetID`) ON DELETE CASCADE,
  CONSTRAINT `accountability_forms_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`userID`) ON DELETE CASCADE,
  CONSTRAINT `accountability_forms_ibfk_4` FOREIGN KEY (`department_id`) REFERENCES `asset_mngmnt_departments` (`departmentID`) ON DELETE SET NULL,
  CONSTRAINT `accountability_forms_ibfk_5` FOREIGN KEY (`location_id`) REFERENCES `asset_mngmnt_locations` (`locationID`) ON DELETE SET NULL,
  CONSTRAINT `accountability_forms_ibfk_6` FOREIGN KEY (`location_room_id`) REFERENCES `asset_mngmnt_location_rooms` (`roomID`) ON DELETE SET NULL,
  CONSTRAINT `accountability_forms_ibfk_7` FOREIGN KEY (`created_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accountability_forms`
--

LOCK TABLES `accountability_forms` WRITE;
/*!40000 ALTER TABLE `accountability_forms` DISABLE KEYS */;
INSERT INTO `accountability_forms` VALUES ('0a973900-400a-11f1-bb64-00ffff729f5c','005-108-1021-042026-0003',NULL,NULL,'86caed5e-b6f8-442a-8423-168d9ad4a579','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97',NULL,'Disabled',NULL,'{\"signedBy\": \"86caed5e-b6f8-442a-8423-168d9ad4a579\", \"signedByName\": \"ittest ittest\", \"digitalSignature\": \"EWEWEW\"}','https://res.cloudinary.com/dp0tpwusz/image/upload/v1777045946/user-initials/clqkli3cureynsaovxxl.png','https://res.cloudinary.com/dp0tpwusz/image/upload/v1777045946/user-initials/clqkli3cureynsaovxxl.png',NULL,NULL,'{\"assets\": [{\"id\": \"ddc41c4f-3fa9-11f1-b309-00ffff729f5c\", \"code\": \"CMTH-ITOFE-PNTR-OU-00021\", \"name\": \"lkklkljkjfkj\", \"type\": \"Pointer\", \"brand\": \"Generic\", \"modelNo\": \"322\", \"category\": \"IT Office Equipment\", \"serialNo\": \"4342\", \"department\": \"IT Department\"}]}','2026-04-25 10:10:02','200.2.4.49','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','2026-04-25 02:18:49','2026-04-25 10:47:41',NULL,NULL,NULL),('0a9bf7ae-400a-11f1-bb64-00ffff729f5c','005-108-1021-042026-0004',NULL,NULL,'38b6ecb2-4f95-4307-bc90-9d2f54d2c133','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97',NULL,'Disabled',NULL,NULL,NULL,NULL,NULL,NULL,'{\"assets\": [{\"id\": \"ddac8482-3f8f-11f1-a473-00ffff729f5c\", \"code\": \"CMTH-COM-AVR-OU-00020\", \"name\": \"kjjfkdsk\", \"type\": \"AVR\", \"brand\": \"ECO POWER\", \"modelNo\": \"fskkfsdfksfkdsjf\", \"category\": \"Computer Equipment\", \"serialNo\": \"fdsfds\", \"department\": \"IT Department\"}, {\"id\": \"f5a9c63d-3fa9-11f1-b309-00ffff729f5c\", \"code\": \"CMTH-ITOFE-RMT-OU-00022\", \"name\": \"45545\", \"type\": \"Remote\", \"brand\": \"Samsung\", \"modelNo\": \"45455\", \"category\": \"IT Office Equipment\", \"serialNo\": \"45454\", \"department\": \"IT Department\"}], \"form_origin\": \"processor_return\"}',NULL,NULL,NULL,'38b6ecb2-4f95-4307-bc90-9d2f54d2c133','2026-04-25 02:18:49','2026-04-25 10:27:47',NULL,NULL,NULL),('178a53d2-404c-11f1-bb64-00ffff729f5c','005-108-1021-042026-0005',NULL,NULL,'86caed5e-b6f8-442a-8423-168d9ad4a579','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97',NULL,'Disabled',NULL,'{\"signedBy\": \"86caed5e-b6f8-442a-8423-168d9ad4a579\", \"signedByName\": \"ittest ittest\", \"digitalSignature\": \"EWEWEW\"}','RY27','RY27',NULL,NULL,'{\"assets\": [{\"id\": \"ddc41c4f-3fa9-11f1-b309-00ffff729f5c\", \"code\": \"CMTH-ITOFE-PNTR-OU-00021\", \"name\": \"lkklkljkjfkj\", \"type\": \"Pointer\", \"brand\": \"Generic\", \"modelNo\": \"322\", \"category\": \"IT Office Equipment\", \"serialNo\": \"4342\", \"department\": \"IT Department\"}, {\"id\": \"889593b6-3f8f-11f1-a473-00ffff729f5c\", \"code\": \"CMTH-COM-GPU-OU-00018\", \"name\": \"llfdsjksdjfd\", \"type\": \"GPU\", \"brand\": \"INNO\", \"modelNo\": \"rew\", \"category\": \"Computer Equipment\", \"serialNo\": \"rew\", \"department\": \"IT Department\"}, {\"id\": \"ac35f4df-3f8f-11f1-a473-00ffff729f5c\", \"code\": \"CMTH-ITOFE-LAP-OU-00019\", \"name\": \"gdhd\", \"type\": \"Laptops / Notebooks\", \"brand\": \"Lenovo\", \"modelNo\": \"fsd\", \"category\": \"IT Office Equipment\", \"serialNo\": \"fds\", \"department\": \"IT Department\"}, {\"id\": \"62468edd-404b-11f1-bb64-00ffff729f5c\", \"code\": \"CMTH-ITOFE-LAP-OU-00025\", \"name\": \"LAptop\", \"type\": \"Laptops / Notebooks\", \"brand\": \"Lenovo\", \"modelNo\": \"Laptop1\", \"category\": \"IT Office Equipment\", \"serialNo\": \"Laptop1\", \"department\": \"IT Department\"}], \"previous_form_id\": \"0a973900-400a-11f1-bb64-00ffff729f5c\", \"previous_form_original_status\": \"Signed\"}','2026-04-25 10:16:05','200.2.4.49','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0','65abe729-c369-447e-a864-a8e98b74b842','2026-04-25 10:11:38','2026-04-25 10:47:41',NULL,NULL,NULL),('20e51857-4051-11f1-bb64-00ffff729f5c','005-108-1021-042026-0008',NULL,NULL,'38b6ecb2-4f95-4307-bc90-9d2f54d2c133','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97',NULL,'Pending',NULL,NULL,NULL,NULL,NULL,NULL,'{\"assets\": [{\"id\": \"ddac8482-3f8f-11f1-a473-00ffff729f5c\", \"code\": \"CMTH-COM-AVR-OU-00020\", \"name\": \"kjjfkdsk\", \"type\": \"AVR\", \"brand\": \"ECO POWER\", \"modelNo\": \"fskkfsdfksfkdsjf\", \"category\": \"Computer Equipment\", \"serialNo\": \"fdsfds\", \"department\": \"IT Department\"}, {\"id\": \"f5a9c63d-3fa9-11f1-b309-00ffff729f5c\", \"code\": \"CMTH-ITOFE-RMT-OU-00022\", \"name\": \"45545\", \"type\": \"Remote\", \"brand\": \"Samsung\", \"modelNo\": \"45455\", \"category\": \"IT Office Equipment\", \"serialNo\": \"45454\", \"department\": \"IT Department\"}, {\"id\": \"ac35f4df-3f8f-11f1-a473-00ffff729f5c\", \"code\": \"CMTH-ITOFE-LAP-OU-00019\", \"name\": \"gdhd\", \"type\": \"Laptops / Notebooks\", \"brand\": \"Lenovo\", \"modelNo\": \"fsd\", \"category\": \"IT Office Equipment\", \"serialNo\": \"fds\", \"department\": \"IT Department\"}, {\"id\": \"889593b6-3f8f-11f1-a473-00ffff729f5c\", \"code\": \"CMTH-COM-GPU-OU-00018\", \"name\": \"llfdsjksdjfd\", \"type\": \"GPU\", \"brand\": \"INNO\", \"modelNo\": \"rew\", \"category\": \"Computer Equipment\", \"serialNo\": \"rew\", \"department\": \"IT Department\"}, {\"id\": \"62468edd-404b-11f1-bb64-00ffff729f5c\", \"code\": \"CMTH-ITOFE-LAP-OU-00025\", \"name\": \"LAptop\", \"type\": \"Laptops / Notebooks\", \"brand\": \"Lenovo\", \"modelNo\": \"Laptop1\", \"category\": \"IT Office Equipment\", \"serialNo\": \"Laptop1\", \"department\": \"IT Department\"}, {\"id\": \"ddc41c4f-3fa9-11f1-b309-00ffff729f5c\", \"code\": \"CMTH-ITOFE-PNTR-OU-00021\", \"name\": \"lkklkljkjfkj\", \"type\": \"Pointer\", \"brand\": \"Generic\", \"modelNo\": \"322\", \"category\": \"IT Office Equipment\", \"serialNo\": \"4342\", \"department\": \"IT Department\"}], \"form_origin\": \"processor_return\"}',NULL,NULL,NULL,'aa76bcaa-88c8-4c9d-aa34-f2e00a4f9c7f','2026-04-25 10:47:41','2026-04-25 10:47:41',NULL,NULL,NULL),('5900cafa-404e-11f1-bb64-00ffff729f5c','005-108-1021-042026-0006',NULL,NULL,'86caed5e-b6f8-442a-8423-168d9ad4a579','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97',NULL,'Disabled',NULL,NULL,'https://res.cloudinary.com/dp0tpwusz/image/upload/v1777045946/user-initials/clqkli3cureynsaovxxl.png','https://res.cloudinary.com/dp0tpwusz/image/upload/v1777045946/user-initials/clqkli3cureynsaovxxl.png',NULL,NULL,'{\"assets\": [{\"id\": \"ddc41c4f-3fa9-11f1-b309-00ffff729f5c\", \"code\": \"CMTH-ITOFE-PNTR-OU-00021\", \"name\": \"lkklkljkjfkj\", \"type\": \"Pointer\", \"brand\": \"Generic\", \"modelNo\": \"322\", \"category\": \"IT Office Equipment\", \"serialNo\": \"4342\", \"department\": \"IT Department\"}]}',NULL,NULL,NULL,'38b6ecb2-4f95-4307-bc90-9d2f54d2c133','2026-04-25 10:27:47','2026-04-25 10:47:41',NULL,NULL,NULL),('59086a18-404e-11f1-bb64-00ffff729f5c','005-108-1021-042026-0007',NULL,NULL,'38b6ecb2-4f95-4307-bc90-9d2f54d2c133','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97',NULL,'Disabled',NULL,'{\"signedBy\": \"38b6ecb2-4f95-4307-bc90-9d2f54d2c133\", \"signedByName\": \"approver approver\", \"digitalSignature\": \"https://res.cloudinary.com/dp0tpwusz/image/upload/v1777045946/user-initials/clqkli3cureynsaovxxl.png\"}',NULL,NULL,NULL,NULL,'{\"assets\": [{\"id\": \"ddac8482-3f8f-11f1-a473-00ffff729f5c\", \"code\": \"CMTH-COM-AVR-OU-00020\", \"name\": \"kjjfkdsk\", \"type\": \"AVR\", \"brand\": \"ECO POWER\", \"modelNo\": \"fskkfsdfksfkdsjf\", \"category\": \"Computer Equipment\", \"serialNo\": \"fdsfds\", \"department\": \"IT Department\"}, {\"id\": \"f5a9c63d-3fa9-11f1-b309-00ffff729f5c\", \"code\": \"CMTH-ITOFE-RMT-OU-00022\", \"name\": \"45545\", \"type\": \"Remote\", \"brand\": \"Samsung\", \"modelNo\": \"45455\", \"category\": \"IT Office Equipment\", \"serialNo\": \"45454\", \"department\": \"IT Department\"}, {\"id\": \"ac35f4df-3f8f-11f1-a473-00ffff729f5c\", \"code\": \"CMTH-ITOFE-LAP-OU-00019\", \"name\": \"gdhd\", \"type\": \"Laptops / Notebooks\", \"brand\": \"Lenovo\", \"modelNo\": \"fsd\", \"category\": \"IT Office Equipment\", \"serialNo\": \"fds\", \"department\": \"IT Department\"}, {\"id\": \"889593b6-3f8f-11f1-a473-00ffff729f5c\", \"code\": \"CMTH-COM-GPU-OU-00018\", \"name\": \"llfdsjksdjfd\", \"type\": \"GPU\", \"brand\": \"INNO\", \"modelNo\": \"rew\", \"category\": \"Computer Equipment\", \"serialNo\": \"rew\", \"department\": \"IT Department\"}, {\"id\": \"62468edd-404b-11f1-bb64-00ffff729f5c\", \"code\": \"CMTH-ITOFE-LAP-OU-00025\", \"name\": \"LAptop\", \"type\": \"Laptops / Notebooks\", \"brand\": \"Lenovo\", \"modelNo\": \"Laptop1\", \"category\": \"IT Office Equipment\", \"serialNo\": \"Laptop1\", \"department\": \"IT Department\"}], \"form_origin\": \"processor_return\"}','2026-04-25 10:29:03','200.2.4.49','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','2026-04-25 10:27:47','2026-04-25 10:47:41',NULL,NULL,NULL),('6595db1a-4008-11f1-bb64-00ffff729f5c','005-108-1021-042026-0001',NULL,NULL,'38b6ecb2-4f95-4307-bc90-9d2f54d2c133','430a3a44-cfd8-11f0-9d93-18c04d003e97','af3a1d62-00a6-11f1-a629-b8cb29c59adf',NULL,'Signed',NULL,'{\"signedBy\": \"38b6ecb2-4f95-4307-bc90-9d2f54d2c133\", \"signedByName\": \"approver approver\", \"digitalSignature\": \"https://res.cloudinary.com/dp0tpwusz/image/upload/v1777045946/user-initials/clqkli3cureynsaovxxl.png\"}','https://res.cloudinary.com/dp0tpwusz/image/upload/v1777045946/user-initials/clqkli3cureynsaovxxl.png','https://res.cloudinary.com/dp0tpwusz/image/upload/v1777045946/user-initials/clqkli3cureynsaovxxl.png',NULL,NULL,'{\"assets\": [{\"id\": \"3e1f1f69-3fac-11f1-b309-00ffff729f5c\", \"code\": \"CMTH-ITOFE-SPKR-OU-00023\", \"name\": \"54545\", \"type\": \"Speaker\", \"brand\": \"Logitech\", \"modelNo\": \"45545\", \"category\": \"IT Office Equipment\", \"serialNo\": \"4545\", \"department\": \"IT Department\"}]}','2026-04-25 02:09:02','192.168.50.181','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','2026-04-25 02:07:03','2026-04-25 02:09:02',NULL,NULL,NULL),('761f7d79-4008-11f1-bb64-00ffff729f5c','005-108-1021-042026-0002',NULL,NULL,'86caed5e-b6f8-442a-8423-168d9ad4a579','430a3a44-cfd8-11f0-9d93-18c04d003e97','87736191-cfde-11f0-9d93-18c04d003e97',NULL,'Disabled',NULL,'{\"signedBy\": \"86caed5e-b6f8-442a-8423-168d9ad4a579\", \"signedByName\": \"ittest ittest\", \"digitalSignature\": \"EWEWEW\"}','https://res.cloudinary.com/dp0tpwusz/image/upload/v1777045946/user-initials/clqkli3cureynsaovxxl.png','https://res.cloudinary.com/dp0tpwusz/image/upload/v1777045946/user-initials/clqkli3cureynsaovxxl.png',NULL,NULL,'{\"assets\": [{\"id\": \"f5a9c63d-3fa9-11f1-b309-00ffff729f5c\", \"code\": \"CMTH-ITOFE-RMT-OU-00022\", \"name\": \"45545\", \"type\": \"Remote\", \"brand\": \"Samsung\", \"modelNo\": \"45455\", \"category\": \"IT Office Equipment\", \"serialNo\": \"45454\", \"department\": \"IT Department\"}, {\"id\": \"ddac8482-3f8f-11f1-a473-00ffff729f5c\", \"code\": \"CMTH-COM-AVR-OU-00020\", \"name\": \"kjjfkdsk\", \"type\": \"AVR\", \"brand\": \"ECO POWER\", \"modelNo\": \"fskkfsdfksfkdsjf\", \"category\": \"Computer Equipment\", \"serialNo\": \"fdsfds\", \"department\": \"IT Department\"}, {\"id\": \"ddc41c4f-3fa9-11f1-b309-00ffff729f5c\", \"code\": \"CMTH-ITOFE-PNTR-OU-00021\", \"name\": \"lkklkljkjfkj\", \"type\": \"Pointer\", \"brand\": \"Generic\", \"modelNo\": \"322\", \"category\": \"IT Office Equipment\", \"serialNo\": \"4342\", \"department\": \"IT Department\"}]}','2026-04-25 02:08:01','192.168.50.181','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0','38b6ecb2-4f95-4307-bc90-9d2f54d2c133','2026-04-25 02:07:31','2026-04-25 10:47:41',NULL,NULL,NULL);
/*!40000 ALTER TABLE `accountability_forms` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-27  8:56:23
