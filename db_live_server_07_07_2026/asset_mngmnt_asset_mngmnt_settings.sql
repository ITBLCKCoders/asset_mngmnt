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
-- Table structure for table `asset_mngmnt_settings`
--

DROP TABLE IF EXISTS `asset_mngmnt_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset_mngmnt_settings` (
  `settingID` int NOT NULL AUTO_INCREMENT,
  `key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('string','number','boolean') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'string',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('active','inactive') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`settingID`),
  UNIQUE KEY `uk_settings_key` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset_mngmnt_settings`
--

LOCK TABLES `asset_mngmnt_settings` WRITE;
/*!40000 ALTER TABLE `asset_mngmnt_settings` DISABLE KEYS */;
INSERT INTO `asset_mngmnt_settings` VALUES (1,'mfa_enabled','true','boolean','Global MFA enable/disable setting. When OFF, users cannot add MFA.','active','2026-04-18 17:09:12','1','2026-04-24 03:34:35','65abe729-c369-447e-a864-a8e98b74b842',NULL),(2,'audit_retention_default_months','36','number','Default retention horizon in months for new companies','active','2026-04-18 21:23:36','1','2026-04-18 21:23:36','1',NULL),(3,'audit_retention_minimum_months','12','number','Minimum retention horizon in months (system-wide floor)','active','2026-04-18 21:23:36','1','2026-04-18 21:23:36','1',NULL),(4,'password_min_length','8','number','Minimum password length requirement','active','2026-04-19 08:53:08','1','2026-06-26 02:41:22','65abe729-c369-447e-a864-a8e98b74b842',NULL),(5,'password_require_uppercase','true','boolean','Require uppercase letters in password','active','2026-04-19 08:53:08','1','2026-06-26 02:41:22','65abe729-c369-447e-a864-a8e98b74b842',NULL),(6,'password_require_lowercase','true','boolean','Require lowercase letters in password','active','2026-04-19 08:53:08','1','2026-06-26 02:41:22','65abe729-c369-447e-a864-a8e98b74b842',NULL),(7,'password_require_numbers','true','boolean','Require numbers in password','active','2026-04-19 08:53:08','1','2026-06-26 02:41:22','65abe729-c369-447e-a864-a8e98b74b842',NULL),(8,'password_require_special','true','boolean','Require special characters in password','active','2026-04-19 08:53:08','1','2026-06-26 02:41:22','65abe729-c369-447e-a864-a8e98b74b842',NULL),(9,'password_expiration_days','90','number','Password expiration period in days (0 = never expires)','active','2026-04-19 08:53:08','1','2026-06-26 02:41:22','65abe729-c369-447e-a864-a8e98b74b842',NULL),(10,'max_login_attempts','10','number','Maximum number of failed login attempts before lockout','active','2026-04-19 08:53:08','1','2026-06-26 02:41:22','65abe729-c369-447e-a864-a8e98b74b842',NULL),(11,'lockout_duration_minutes','15','number','Initial lockout duration in minutes (progressive lockout adds 10 mins per subsequent lockout)','active','2026-04-19 08:53:08','1','2026-06-26 02:41:22','65abe729-c369-447e-a864-a8e98b74b842',NULL),(12,'session_timeout_minutes','30','number','Session inactivity timeout in minutes','active','2026-04-19 08:53:08','1','2026-06-26 02:41:22','65abe729-c369-447e-a864-a8e98b74b842',NULL),(13,'audit_logging_enabled','true','boolean','Enable/disable audit logging. When disabled, stops creating new audit logs.','active','2026-04-19 08:53:08','1','2026-06-26 02:41:22','65abe729-c369-447e-a864-a8e98b74b842',NULL),(15,'otp_expiry_seconds','300','number','Setting for otp_expiry_seconds','active','2026-06-26 02:40:59','65abe729-c369-447e-a864-a8e98b74b842','2026-06-26 02:41:22','65abe729-c369-447e-a864-a8e98b74b842',NULL);
/*!40000 ALTER TABLE `asset_mngmnt_settings` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-07  7:59:19
