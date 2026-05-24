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
-- Table structure for table `asset_checklists`
--

DROP TABLE IF EXISTS `asset_checklists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_checklists` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `form_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assignment_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `employee_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `employee_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `employee_designation` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employee_department` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employee_company` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type_onboarding` tinyint(1) DEFAULT '0',
  `type_offboarding` tinyint(1) DEFAULT '0',
  `received_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `checklist_data` json DEFAULT NULL,
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employee_signed_at` timestamp NULL DEFAULT NULL,
  `employee_digital_signature` text COLLATE utf8mb4_unicode_ci,
  `dept_head_signed_at` timestamp NULL DEFAULT NULL,
  `dept_head_signed_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dept_head_digital_signature` text COLLATE utf8mb4_unicode_ci,
  `it_manager_signed_at` timestamp NULL DEFAULT NULL,
  `it_manager_signed_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `it_manager_digital_signature` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_asset_checklists_assignment_id` (`assignment_id`),
  KEY `idx_asset_checklists_employee_id` (`employee_id`),
  KEY `fk_asset_checklists_created_by` (`created_by`),
  KEY `idx_asset_checklists_form_number` (`form_number`),
  KEY `fk_asset_checklists_dept_head_signed_by` (`dept_head_signed_by`),
  KEY `fk_asset_checklists_it_manager_signed_by` (`it_manager_signed_by`),
  CONSTRAINT `fk_asset_checklists_assignment_id` FOREIGN KEY (`assignment_id`) REFERENCES `asset_assignments` (`assignmentID`) ON DELETE CASCADE,
  CONSTRAINT `fk_asset_checklists_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL,
  CONSTRAINT `fk_asset_checklists_dept_head_signed_by` FOREIGN KEY (`dept_head_signed_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL,
  CONSTRAINT `fk_asset_checklists_employee_id` FOREIGN KEY (`employee_id`) REFERENCES `users` (`userID`) ON DELETE CASCADE,
  CONSTRAINT `fk_asset_checklists_it_manager_signed_by` FOREIGN KEY (`it_manager_signed_by`) REFERENCES `users` (`userID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_checklists`
--

LOCK TABLES `asset_checklists` WRITE;
/*!40000 ALTER TABLE `asset_checklists` DISABLE KEYS */;
INSERT INTO `asset_checklists` VALUES ('0d62b380-a887-450b-b2cc-4bbcaaa8de55','005-108-1002-052026-0003','bf9b7388-9d4a-415f-9087-b7cdfe4f29d0','86caed5e-b6f8-442a-8423-168d9ad4a579','ittest ittest','IT Manager','IT Department','CMTHoldings',1,0,'Jr. Full Stack Developer','{\"microsoft365Setup\": {\"loginUser\": true, \"installM365\": true}, \"userAccessControl\": {\"disableGuestAccounts\": true, \"createItAdminAndStandardUser\": true}, \"applicationControl\": {\"installApprovedSoftwareOnly\": true}, \"endpointProtection\": {\"enableBitLocker\": true, \"disableUsbStorage\": true, \"installAntivirusEset\": true, \"enableRealTimeProtection\": true}, \"networkConfiguration\": {\"connectToNetwork\": true, \"registerMacOnFirewall\": true}, \"osPreparationCleanup\": {\"updateWindows\": true, \"installDrivers\": true, \"removeBloatware\": true}, \"systemIdentityNaming\": {\"applyDeviceNamingStandard\": true, \"recordSpecsSerialsMacUserBitlockerKeyWarranty\": true}, \"patchUpdateManagement\": {\"enableUpdates\": true, \"applyUpdatePolicy\": true}, \"firmwareHardwareValidation\": {\"enableTpm\": true, \"updateBios\": true, \"setBiosPassword\": true, \"enableSecureBoot\": true}}',NULL,'2026-05-21 23:38:27','65abe729-c369-447e-a864-a8e98b74b842',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('3127a72f-ed1e-48c1-bb64-68f18c8dcc4f','005-108-1002-052026-0002','03af1fe3-da8b-482d-81ca-556761462512','65abe729-c369-447e-a864-a8e98b74b842','Ryan Rey Magdalita','Jr. Full Stack Developer','IT Department','CMTHoldings',1,0,'Jr. Full Stack Developer','{\"microsoft365Setup\": {\"loginUser\": true, \"installM365\": true}, \"userAccessControl\": {\"disableGuestAccounts\": true, \"createItAdminAndStandardUser\": true}, \"applicationControl\": {\"installApprovedSoftwareOnly\": true}, \"endpointProtection\": {\"enableBitLocker\": true, \"disableUsbStorage\": true, \"installAntivirusEset\": true, \"enableRealTimeProtection\": true}, \"networkConfiguration\": {\"connectToNetwork\": true, \"registerMacOnFirewall\": true}, \"osPreparationCleanup\": {\"updateWindows\": true, \"installDrivers\": true, \"removeBloatware\": true}, \"systemIdentityNaming\": {\"applyDeviceNamingStandard\": true, \"recordSpecsSerialsMacUserBitlockerKeyWarranty\": true}, \"patchUpdateManagement\": {\"enableUpdates\": true, \"applyUpdatePolicy\": true}, \"firmwareHardwareValidation\": {\"enableTpm\": true, \"updateBios\": true, \"setBiosPassword\": true, \"enableSecureBoot\": true}}',NULL,'2026-05-21 18:24:09','65abe729-c369-447e-a864-a8e98b74b842','2026-05-21 18:45:27','https://res.cloudinary.com/dp0tpwusz/image/upload/v1779370185/user-initials/dmxgw7przm4yerzlpyuv.png','2026-05-21 19:02:35','65abe729-c369-447e-a864-a8e98b74b842','https://res.cloudinary.com/dp0tpwusz/image/upload/v1779370185/user-initials/dmxgw7przm4yerzlpyuv.png','2026-05-21 19:10:43','65abe729-c369-447e-a864-a8e98b74b842','https://res.cloudinary.com/dp0tpwusz/image/upload/v1779370185/user-initials/dmxgw7przm4yerzlpyuv.png'),('82146035-b278-4685-bdda-1a59bc0a1291','005-108-1002-052026-0001','01a68458-a8fb-40a7-856e-0de00af5ef86','65abe729-c369-447e-a864-a8e98b74b842','Ryan Rey Magdalita','Jr. Full Stack Developer','IT Department','CMTHoldings',1,0,'Jr. Full Stack Developer','{\"microsoft365Setup\": {\"loginUser\": true, \"installM365\": true}, \"userAccessControl\": {\"disableGuestAccounts\": true, \"createItAdminAndStandardUser\": true}, \"applicationControl\": {\"installApprovedSoftwareOnly\": true}, \"endpointProtection\": {\"enableBitLocker\": true, \"disableUsbStorage\": true, \"installAntivirusEset\": true, \"enableRealTimeProtection\": true}, \"networkConfiguration\": {\"connectToNetwork\": true, \"registerMacOnFirewall\": true}, \"osPreparationCleanup\": {\"updateWindows\": true, \"installDrivers\": true, \"removeBloatware\": true}, \"systemIdentityNaming\": {\"applyDeviceNamingStandard\": true, \"recordSpecsSerialsMacUserBitlockerKeyWarranty\": true}, \"patchUpdateManagement\": {\"enableUpdates\": true, \"applyUpdatePolicy\": true}, \"firmwareHardwareValidation\": {\"enableTpm\": true, \"updateBios\": true, \"setBiosPassword\": true, \"enableSecureBoot\": true}}',NULL,'2026-05-21 18:24:09','65abe729-c369-447e-a864-a8e98b74b842','2026-05-21 18:45:27','https://res.cloudinary.com/dp0tpwusz/image/upload/v1779370185/user-initials/dmxgw7przm4yerzlpyuv.png','2026-05-21 19:02:35','65abe729-c369-447e-a864-a8e98b74b842','https://res.cloudinary.com/dp0tpwusz/image/upload/v1779370185/user-initials/dmxgw7przm4yerzlpyuv.png','2026-05-21 19:10:43','65abe729-c369-447e-a864-a8e98b74b842','https://res.cloudinary.com/dp0tpwusz/image/upload/v1779370185/user-initials/dmxgw7przm4yerzlpyuv.png');
/*!40000 ALTER TABLE `asset_checklists` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-24 14:55:04
