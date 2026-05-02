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
-- Table structure for table `password_operations`
--

DROP TABLE IF EXISTS `password_operations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_operations` (
  `id` char(36) NOT NULL DEFAULT (uuid()),
  `user_id` char(36) NOT NULL,
  `operation_type` enum('change','reset','initial') NOT NULL,
  `old_password_hash` varchar(255) DEFAULT NULL,
  `new_password_hash` varchar(255) NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_timestamp` (`timestamp`),
  CONSTRAINT `password_operations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`users_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Tracks all password change and reset operations with full audit trail';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_operations`
--

LOCK TABLES `password_operations` WRITE;
/*!40000 ALTER TABLE `password_operations` DISABLE KEYS */;
INSERT INTO `password_operations` VALUES ('06ce97e3-f49a-11f0-bb4b-047c16a6248d','19ae6a2e-e328-7c42-2b71-1c9a6c307269','change','$2b$10$cPnFUWOE97rV5wWss33B/u1Eh9cJlgoU0cT31YTE0m0LbIu9OUCgO','$2b$10$6Z4zsDVH8CVrPcAGvOulTeRpnVC9LXISext1ZgjLtjL82rhABkLq2','2026-01-18 18:18:02','192.168.8.100','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),('0d1b3580-f499-11f0-bb4b-047c16a6248d','19ae6a2e-e328-7c42-2b71-1c9a6c307269','change','$2b$10$cPnFUWOE97rV5wWss33B/u1Eh9cJlgoU0cT31YTE0m0LbIu9OUCgO','$2b$10$Ugz518WlUFn73tGGi7LXLuZjGGDKcJ/iMBrSBLdTbNQBlffiYIPhy','2026-01-18 18:11:03','192.168.8.100','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'),('21399af5-f49b-11f0-bb4b-047c16a6248d','19ae6a2e-e328-7c42-2b71-1c9a6c307269','change','$2b$10$cPnFUWOE97rV5wWss33B/u1Eh9cJlgoU0cT31YTE0m0LbIu9OUCgO','$2b$10$fnln8g704ZQtjpjH0r1Ut.ZLUx3IAlrYlulXA/MM0cU7hB0Yidhni','2026-01-18 18:25:56','192.168.8.100','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),('2159dafd-f4a0-11f0-bb4b-047c16a6248d','19ae866b-51f2-7ff1-05d3-6f19d975bc67','change','$2b$10$oOdlXS8oWGKj6wmg14yrM.MLltEGadPSamI1XMPrYyEOfzrWL.K4y','$2b$10$PgXqOosKPKL05KeWXLbZbOTFpQbCGTRV/tdrZZbJOeRZsNlkbBmFS','2026-01-18 19:01:43','192.168.8.100','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'),('36da5007-f49d-11f0-bb4b-047c16a6248d','19ae866b-51f2-7ff1-05d3-6f19d975bc67','reset','$2b$10$.JR/1QPvYuQA3cR1EFfbv.tUzHNmPeTNyN0NeKXZbZkaYFGgdhFWS','$2b$10$jGydHJfhtByja25Iv03BSuC62xwWdTcAKAylojv3WLmynMDS.cR6a','2026-01-18 18:40:51','192.168.8.100','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'),('56a908bc-f49e-11f0-bb4b-047c16a6248d','19ae866b-51f2-7ff1-05d3-6f19d975bc67','reset','$2b$10$deP6aWm/6lLA5bNMwkI3E.ranknZc.KFfGQ9b2xecneUZHo7nBuQ2','$2b$10$oOdlXS8oWGKj6wmg14yrM.MLltEGadPSamI1XMPrYyEOfzrWL.K4y','2026-01-18 18:48:54','192.168.8.100','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'),('5f6c3156-f4a1-11f0-bb4b-047c16a6248d','19ae866b-51f2-7ff1-05d3-6f19d975bc67','change','$2b$10$YD4vYWXwaPYBBgJAXyJWHOKLm5k0i/zfT8AdVLON22RH8X3zckGLm','$2b$10$qdhLQlaAbpk0q7u.SNhxAuNt03Yv6NeniCs.fBJSj8QKQUEaPIf6C','2026-01-18 19:10:37','192.168.8.100','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'),('6ced02f0-f49a-11f0-bb4b-047c16a6248d','19ae6a2e-e328-7c42-2b71-1c9a6c307269','change','$2b$10$cPnFUWOE97rV5wWss33B/u1Eh9cJlgoU0cT31YTE0m0LbIu9OUCgO','$2b$10$oLNovl7B8JnaHuLyTgvkhu6ptLvOrq7qusb1gML71KVO.nDpsxtNe','2026-01-18 18:20:53','192.168.8.100','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),('74b9c4c5-f499-11f0-bb4b-047c16a6248d','19ae6a2e-e328-7c42-2b71-1c9a6c307269','change','$2b$10$cPnFUWOE97rV5wWss33B/u1Eh9cJlgoU0cT31YTE0m0LbIu9OUCgO','$2b$10$10FuoKDlfn9rzkFv16bRLe1I8g9D91EcqdUQA4.PjM2m8ulxLwfcq','2026-01-18 18:13:57','192.168.8.100','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),('7fe207a8-f4a1-11f0-bb4b-047c16a6248d','19ae866b-51f2-7ff1-05d3-6f19d975bc67','reset','$2b$10$qdhLQlaAbpk0q7u.SNhxAuNt03Yv6NeniCs.fBJSj8QKQUEaPIf6C','$2b$10$NvemKh/U3ee5uWnTTg2cQeVqmkLoL6.bkXXshq3ttApCuJA0r9FRK','2026-01-18 19:11:32','192.168.8.100','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'),('89e5964c-f498-11f0-bb4b-047c16a6248d','19ae6a2e-e328-7c42-2b71-1c9a6c307269','initial',NULL,'$2b$10$cPnFUWOE97rV5wWss33B/u1Eh9cJlgoU0cT31YTE0m0LbIu9OUCgO','2026-01-18 18:07:23','system','initial_setup'),('89e59dd0-f498-11f0-bb4b-047c16a6248d','19ae866b-51f2-7ff1-05d3-6f19d975bc67','initial',NULL,'$2b$10$.JR/1QPvYuQA3cR1EFfbv.tUzHNmPeTNyN0NeKXZbZkaYFGgdhFWS','2026-01-18 18:07:23','system','initial_setup'),('89e5a119-f498-11f0-bb4b-047c16a6248d','19b11217-2a27-7263-40cf-476b776d1dad','initial',NULL,'$2b$10$1pXiO5X2xYWC3m6xvEV3seskpcPq10vj7fqoVR4NvKC74ivVtCCiS','2026-01-18 18:07:23','system','initial_setup'),('89e5a23c-f498-11f0-bb4b-047c16a6248d','19b584dd-1b46-7f6e-8113-6d90d7cbb643','initial',NULL,'$2b$10$VCFq/yqGD2C02zXslw6cdesXL9Vp/V2RsfBsNpl4AoGSsTNsDtMV2','2026-01-18 18:07:23','system','initial_setup'),('89e5a356-f498-11f0-bb4b-047c16a6248d','19b585bd-3612-73c6-8bc4-7853e8afe14f','initial',NULL,'$2b$10$rcdKC5wIYAGID56oaX3pWOQH29cxXnnPerg50L9ieYWFEtfE1N6ju','2026-01-18 18:07:23','system','initial_setup'),('89e5a44d-f498-11f0-bb4b-047c16a6248d','19b7c6af-4f15-7384-2c14-ddc240237709','initial',NULL,'$2b$10$tspqqJSZ4jMdPH4sqvbtSeyPNhWwBezGY5cmXHK9ProwlFHULy9n6','2026-01-18 18:07:23','system','initial_setup'),('b2ad66a7-f498-11f0-bb4b-047c16a6248d','19ae6a2e-e328-7c42-2b71-1c9a6c307269','change','$2b$10$cPnFUWOE97rV5wWss33B/u1Eh9cJlgoU0cT31YTE0m0LbIu9OUCgO','$2b$10$YgLpNUhAFQV677LSWb87peLzOb2vVa0bdtJlgIm.3szCgMpjOkYsC','2026-01-18 18:08:31','192.168.8.100','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'),('beaf5d8e-f49a-11f0-bb4b-047c16a6248d','19ae6a2e-e328-7c42-2b71-1c9a6c307269','change','$2b$10$cPnFUWOE97rV5wWss33B/u1Eh9cJlgoU0cT31YTE0m0LbIu9OUCgO','$2b$10$GXuuZ0QSjKbbTp1VulEvyeLeCAeMEhIG2cr.lMKjZyW2PiNOBV4Ti','2026-01-18 18:23:10','192.168.8.100','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),('c7c71be4-f4a0-11f0-bb4b-047c16a6248d','19ae866b-51f2-7ff1-05d3-6f19d975bc67','change','$2b$10$PgXqOosKPKL05KeWXLbZbOTFpQbCGTRV/tdrZZbJOeRZsNlkbBmFS','$2b$10$Rmf1xrBLZIigVTs1ZG776O/ejkSFBCtu4yAtPJFOcG/cRj5EEWTJ6','2026-01-18 19:06:23','192.168.8.100','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'),('d791516d-f499-11f0-bb4b-047c16a6248d','19ae6a2e-e328-7c42-2b71-1c9a6c307269','change','$2b$10$cPnFUWOE97rV5wWss33B/u1Eh9cJlgoU0cT31YTE0m0LbIu9OUCgO','$2b$10$nMMWxyrm7LyEt/U32XcF2e8JfBFfFJMawG2GWw8F8huNWLAEqG5/i','2026-01-18 18:16:43','192.168.8.100','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'),('db2b3f65-f498-11f0-bb4b-047c16a6248d','19ae6a2e-e328-7c42-2b71-1c9a6c307269','change','$2b$10$cPnFUWOE97rV5wWss33B/u1Eh9cJlgoU0cT31YTE0m0LbIu9OUCgO','$2b$10$frFY00Ww48pl8m2hWoTD4OOpSL6RFug.7ajnZ8xLr8TBo9v8ts8dC','2026-01-18 18:09:39','192.168.8.100','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'),('e4d53e52-f4a0-11f0-bb4b-047c16a6248d','19ae866b-51f2-7ff1-05d3-6f19d975bc67','reset','$2b$10$Rmf1xrBLZIigVTs1ZG776O/ejkSFBCtu4yAtPJFOcG/cRj5EEWTJ6','$2b$10$YD4vYWXwaPYBBgJAXyJWHOKLm5k0i/zfT8AdVLON22RH8X3zckGLm','2026-01-18 19:07:11','192.168.8.100','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'),('f2fac494-f49d-11f0-bb4b-047c16a6248d','19ae866b-51f2-7ff1-05d3-6f19d975bc67','reset','$2b$10$.JR/1QPvYuQA3cR1EFfbv.tUzHNmPeTNyN0NeKXZbZkaYFGgdhFWS','$2b$10$deP6aWm/6lLA5bNMwkI3E.ranknZc.KFfGQ9b2xecneUZHo7nBuQ2','2026-01-18 18:46:07','192.168.8.100','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36');
/*!40000 ALTER TABLE `password_operations` ENABLE KEYS */;
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
