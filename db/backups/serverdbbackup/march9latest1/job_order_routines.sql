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
-- Temporary view structure for view `job_orders_with_received_by`
--

DROP TABLE IF EXISTS `job_orders_with_received_by`;
/*!50001 DROP VIEW IF EXISTS `job_orders_with_received_by`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `job_orders_with_received_by` AS SELECT 
 1 AS `id`,
 1 AS `jobOrderId`,
 1 AS `requestor`,
 1 AS `requestorDepartment`,
 1 AS `requestorCompany`,
 1 AS `requestorPosition`,
 1 AS `requestorEmail`,
 1 AS `requestorContactNumber`,
 1 AS `company`,
 1 AS `department`,
 1 AS `billedTo`,
 1 AS `dateNeeded`,
 1 AS `subject`,
 1 AS `description`,
 1 AS `categories`,
 1 AS `remarks`,
 1 AS `dateSubmitted`,
 1 AS `status`,
 1 AS `createdAt`,
 1 AS `updatedAt`,
 1 AS `declineReason`,
 1 AS `approvedBy`,
 1 AS `approvedAt`,
 1 AS `approverRemarks`,
 1 AS `declinedBy`,
 1 AS `declinedAt`,
 1 AS `receivedBy`,
 1 AS `receivedAt`,
 1 AS `receiverRemarks`,
 1 AS `actionDoneAt`,
 1 AS `actionDoneBy`,
 1 AS `workRemarks`,
 1 AS `completedAt`,
 1 AS `acknowledgedAt`,
 1 AS `assignedTo`,
 1 AS `assignedBy`,
 1 AS `assignmentMessage`,
 1 AS `startDate`,
 1 AS `endDate`,
 1 AS `receivedByUserId`,
 1 AS `receivedByFirstName`,
 1 AS `receivedByLastName`,
 1 AS `receivedByUsername`,
 1 AS `receivedByEmail`,
 1 AS `receivedByContactNumber`,
 1 AS `receivedByPosition`,
 1 AS `receivedByCompany`,
 1 AS `receivedByDepartment`,
 1 AS `receivedByRole`,
 1 AS `receivedByName`,
 1 AS `assignedToUserId`,
 1 AS `assignedToFirstName`,
 1 AS `assignedToLastName`,
 1 AS `assignedToUsername`,
 1 AS `assignedToEmail`,
 1 AS `assignedToContactNumber`,
 1 AS `assignedToPosition`,
 1 AS `assignedToCompany`,
 1 AS `assignedToDepartment`,
 1 AS `assignedToRole`,
 1 AS `assignedToName`,
 1 AS `assignedByUserId`,
 1 AS `assignedByFirstName`,
 1 AS `assignedByLastName`,
 1 AS `assignedByUsername`,
 1 AS `assignedByEmail`,
 1 AS `assignedByContactNumber`,
 1 AS `assignedByPosition`,
 1 AS `assignedByCompany`,
 1 AS `assignedByDepartment`,
 1 AS `assignedByRole`,
 1 AS `assignedByName`,
 1 AS `approvedByUserId`,
 1 AS `approvedByFirstName`,
 1 AS `approvedByLastName`,
 1 AS `approvedByUsername`,
 1 AS `approvedByEmail`,
 1 AS `approvedByContactNumber`,
 1 AS `approvedByPosition`,
 1 AS `approvedByCompany`,
 1 AS `approvedByDepartment`,
 1 AS `approvedByRole`,
 1 AS `approvedByName`,
 1 AS `declinedByUserId`,
 1 AS `declinedByFirstName`,
 1 AS `declinedByLastName`,
 1 AS `declinedByUsername`,
 1 AS `declinedByEmail`,
 1 AS `declinedByContactNumber`,
 1 AS `declinedByPosition`,
 1 AS `declinedByCompany`,
 1 AS `declinedByDepartment`,
 1 AS `declinedByRole`,
 1 AS `declinedByName`*/;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `job_orders_with_received_by`
--

/*!50001 DROP VIEW IF EXISTS `job_orders_with_received_by`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb3 */;
/*!50001 SET character_set_results     = utf8mb3 */;
/*!50001 SET collation_connection      = utf8mb3_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `job_orders_with_received_by` AS select `jo`.`job_orders_id` AS `id`,`jo`.`job_order_id` AS `jobOrderId`,`jo`.`requestor` AS `requestor`,`jo`.`requestor_department` AS `requestorDepartment`,`jo`.`requestor_company` AS `requestorCompany`,`jo`.`requestor_position` AS `requestorPosition`,`jo`.`requestor_email` AS `requestorEmail`,`jo`.`requestor_contact_number` AS `requestorContactNumber`,`jo`.`company` AS `company`,`jo`.`department` AS `department`,`jo`.`billed_to` AS `billedTo`,`jo`.`date_needed` AS `dateNeeded`,`jo`.`subject` AS `subject`,`jo`.`description` AS `description`,`jo`.`categories` AS `categories`,`jo`.`remarks` AS `remarks`,`jo`.`date_submitted` AS `dateSubmitted`,`jo`.`status` AS `status`,`jo`.`created_at` AS `createdAt`,`jo`.`updated_at` AS `updatedAt`,`jo`.`decline_reason` AS `declineReason`,`jo`.`approved_by_id` AS `approvedBy`,`jo`.`approved_at` AS `approvedAt`,`jo`.`approver_remarks` AS `approverRemarks`,`jo`.`declined_by_id` AS `declinedBy`,`jo`.`declined_at` AS `declinedAt`,`jo`.`received_by_id` AS `receivedBy`,`jo`.`received_at` AS `receivedAt`,`jo`.`receiver_remarks` AS `receiverRemarks`,`jo`.`action_done_at` AS `actionDoneAt`,`jo`.`action_done_by_id` AS `actionDoneBy`,`jo`.`action_done_remarks` AS `workRemarks`,`jo`.`completed_at` AS `completedAt`,`jo`.`acknowledged_at` AS `acknowledgedAt`,`jo`.`assigned_to_id` AS `assignedTo`,`jo`.`assigned_by_id` AS `assignedBy`,`jo`.`assignment_message` AS `assignmentMessage`,`jo`.`start_date` AS `startDate`,`jo`.`end_date` AS `endDate`,`r_user`.`users_id` AS `receivedByUserId`,`r_user`.`firstName` AS `receivedByFirstName`,`r_user`.`lastName` AS `receivedByLastName`,`r_user`.`username` AS `receivedByUsername`,`r_user`.`email` AS `receivedByEmail`,`r_user`.`contactNumber` AS `receivedByContactNumber`,`r_user`.`position` AS `receivedByPosition`,`r_user`.`company` AS `receivedByCompany`,`r_user`.`department` AS `receivedByDepartment`,`r_user`.`role` AS `receivedByRole`,(case when ((`r_user`.`firstName` is not null) and (`r_user`.`lastName` is not null)) then concat(`r_user`.`firstName`,' ',`r_user`.`lastName`) else 'Unknown User' end) AS `receivedByName`,`a_user`.`users_id` AS `assignedToUserId`,`a_user`.`firstName` AS `assignedToFirstName`,`a_user`.`lastName` AS `assignedToLastName`,`a_user`.`username` AS `assignedToUsername`,`a_user`.`email` AS `assignedToEmail`,`a_user`.`contactNumber` AS `assignedToContactNumber`,`a_user`.`position` AS `assignedToPosition`,`a_user`.`company` AS `assignedToCompany`,`a_user`.`department` AS `assignedToDepartment`,`a_user`.`role` AS `assignedToRole`,(case when ((`a_user`.`firstName` is not null) and (`a_user`.`lastName` is not null)) then concat(`a_user`.`firstName`,' ',`a_user`.`lastName`) else 'Not Assigned' end) AS `assignedToName`,`assigner_user`.`users_id` AS `assignedByUserId`,`assigner_user`.`firstName` AS `assignedByFirstName`,`assigner_user`.`lastName` AS `assignedByLastName`,`assigner_user`.`username` AS `assignedByUsername`,`assigner_user`.`email` AS `assignedByEmail`,`assigner_user`.`contactNumber` AS `assignedByContactNumber`,`assigner_user`.`position` AS `assignedByPosition`,`assigner_user`.`company` AS `assignedByCompany`,`assigner_user`.`department` AS `assignedByDepartment`,`assigner_user`.`role` AS `assignedByRole`,(case when ((`assigner_user`.`firstName` is not null) and (`assigner_user`.`lastName` is not null)) then concat(`assigner_user`.`firstName`,' ',`assigner_user`.`lastName`) else 'System' end) AS `assignedByName`,`app_user`.`users_id` AS `approvedByUserId`,`app_user`.`firstName` AS `approvedByFirstName`,`app_user`.`lastName` AS `approvedByLastName`,`app_user`.`username` AS `approvedByUsername`,`app_user`.`email` AS `approvedByEmail`,`app_user`.`contactNumber` AS `approvedByContactNumber`,`app_user`.`position` AS `approvedByPosition`,`app_user`.`company` AS `approvedByCompany`,`app_user`.`department` AS `approvedByDepartment`,`app_user`.`role` AS `approvedByRole`,(case when ((`app_user`.`firstName` is not null) and (`app_user`.`lastName` is not null)) then concat(`app_user`.`firstName`,' ',`app_user`.`lastName`) else 'Not Approved' end) AS `approvedByName`,`dec_user`.`users_id` AS `declinedByUserId`,`dec_user`.`firstName` AS `declinedByFirstName`,`dec_user`.`lastName` AS `declinedByLastName`,`dec_user`.`username` AS `declinedByUsername`,`dec_user`.`email` AS `declinedByEmail`,`dec_user`.`contactNumber` AS `declinedByContactNumber`,`dec_user`.`position` AS `declinedByPosition`,`dec_user`.`company` AS `declinedByCompany`,`dec_user`.`department` AS `declinedByDepartment`,`dec_user`.`role` AS `declinedByRole`,(case when ((`dec_user`.`firstName` is not null) and (`dec_user`.`lastName` is not null)) then concat(`dec_user`.`firstName`,' ',`dec_user`.`lastName`) else 'Not Declined' end) AS `declinedByName` from (((((`job_orders` `jo` left join `users` `r_user` on((`jo`.`received_by_id` = `r_user`.`users_id`))) left join `users` `a_user` on((`jo`.`assigned_to_id` = `a_user`.`users_id`))) left join `users` `assigner_user` on((`jo`.`assigned_by_id` = `assigner_user`.`users_id`))) left join `users` `app_user` on((`jo`.`approved_by_id` = `app_user`.`users_id`))) left join `users` `dec_user` on((`jo`.`declined_by_id` = `dec_user`.`users_id`))) where (`jo`.`deleted_at` is null) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Dumping events for database 'job_order'
--

--
-- Dumping routines for database 'job_order'
--
/*!50003 DROP FUNCTION IF EXISTS `uuid_v7` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` FUNCTION `uuid_v7`() RETURNS char(36) CHARSET utf8mb4
    DETERMINISTIC
BEGIN
    DECLARE ts BIGINT DEFAULT (UNIX_TIMESTAMP() * 1000);
    DECLARE rand_part CHAR(23);
    SET rand_part = HEX(FLOOR(RAND() * 9223372036854775807));
    RETURN LOWER(CONCAT(
        LPAD(HEX(ts), 8, '0'), '-',
        LPAD(HEX(FLOOR(RAND() * 65535)), 4, '0'), '-7',
        LPAD(HEX(FLOOR(RAND() * 4095)), 3, '0'), '-',
        LPAD(HEX(FLOOR(RAND() * 65535)), 4, '0'), '-',
        LPAD(rand_part, 12, '0')
    ));
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_approve_job_order` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_approve_job_order`(
  IN p_job_orders_id CHAR(36),
  IN p_approved_by CHAR(36),
  IN p_received_at DATETIME,
  IN p_action_done_at DATETIME,
  IN p_completed_at DATETIME
)
BEGIN
  UPDATE job_orders SET
    status = 'completed',
    approved_by_id = p_approved_by,
    received_at = COALESCE(p_received_at, NOW()),
    action_done_at = COALESCE(p_action_done_at, NOW()),
    completed_at = COALESCE(p_completed_at, NOW()),
    updated_at = NOW()
  WHERE job_orders_id = p_job_orders_id AND deleted_at IS NULL;

  -- Return the updated record
  SELECT
    job_orders_id AS id, job_order_id AS jobOrderId,
    requestor, requestor_department AS requestorDepartment,
    requestor_company AS requestorCompany,
    requestor_email AS requestorEmail,
    requestor_contact_number AS requestorContactNumber,
    company, department, billed_to AS billedTo,
    date_needed AS dateNeeded,
    subject, description, categories, remarks,
    date_submitted AS dateSubmitted,
    status,
    created_at AS createdAt,
    updated_at AS updatedAt,
    decline_reason, approved_by_id, declined_by_id,
    received_at, action_done_at, completed_at
  FROM job_orders
  WHERE job_orders_id = p_job_orders_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_assign_worker_role` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_assign_worker_role`(
    IN p_users_id CHAR(36)
)
BEGIN
    -- Update the user's role to 'assigned worker'
    UPDATE users SET role = 'assigned worker' WHERE users_id = p_users_id;

    -- Return success
    SELECT 'success' AS status, 'Worker role assigned' AS message;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_check_user_exists` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_check_user_exists`(
  IN in_identifier VARCHAR(255)
)
BEGIN
  SELECT users_id, username, email, employeeNumber
  FROM users
  WHERE username = in_identifier OR email = in_identifier OR employeeNumber = in_identifier
  LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_clear_refresh_token_by_token` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_clear_refresh_token_by_token`(IN in_refreshToken VARCHAR(512))
BEGIN
  UPDATE users SET refreshToken = NULL WHERE refreshToken = in_refreshToken;
  SELECT ROW_COUNT() AS affected;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_create_job_order` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_create_job_order`(
  IN p_job_order_id VARCHAR(100),
  IN p_requestor VARCHAR(100),
  IN p_requestor_department VARCHAR(100),
  IN p_requestor_company VARCHAR(100),
  IN p_requestor_position VARCHAR(100),
  IN p_requestor_email VARCHAR(100),
  IN p_requestor_contact_number VARCHAR(20),
  IN p_company VARCHAR(100),
  IN p_department VARCHAR(100),
  IN p_billed_to VARCHAR(100),
  IN p_date_needed DATE,
  IN p_subject VARCHAR(200),
  IN p_description TEXT,
  IN p_categories JSON,
  IN p_remarks TEXT,
  IN p_status VARCHAR(20)
)
BEGIN
  DECLARE v_date_submitted DATETIME DEFAULT NOW();
  DECLARE v_final_status VARCHAR(20);
  DECLARE v_id CHAR(36) DEFAULT uuid_v7();

  -- Default to 'draft' if status is NULL or invalid
  SET v_final_status = COALESCE(p_status, 'draft');

  IF v_final_status NOT IN ('draft', 'pending', 'approved', 'received', 'in_progress', 'action_done', 'completed', 'declined', 'assigned', 'ongoing', 'waiting_confirmation', 'acknowledged', 'complete') THEN
    SET v_final_status = 'draft';
  END IF;

  INSERT INTO job_orders (
    job_orders_id,
    job_order_id,
    requestor,
    requestor_department,
    requestor_company,
    requestor_position,
    requestor_email,
    requestor_contact_number,
    company,
    department,
    billed_to,
    date_needed,
    subject,
    description,
    categories,
    remarks,
    date_submitted,
    status
  )
  VALUES (
    v_id,
    p_job_order_id,
    p_requestor,
    p_requestor_department,
    p_requestor_company,
    p_requestor_position,
    p_requestor_email,
    p_requestor_contact_number,
    p_company,
    p_department,
    p_billed_to,
    p_date_needed,
    p_subject,
    p_description,
    p_categories,
    p_remarks,
    v_date_submitted,
    v_final_status
  );

  SELECT v_id AS id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_create_user` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_create_user`(
  IN p_firstName VARCHAR(100),
  IN p_lastName VARCHAR(100),
  IN p_username VARCHAR(100),
  IN p_email VARCHAR(255),
  IN p_password VARCHAR(255),
  IN p_employeeNumber VARCHAR(50),
  IN p_position VARCHAR(100),
  IN p_contactNumber VARCHAR(50),
  IN p_company VARCHAR(100),
  IN p_department VARCHAR(100),
  IN p_role VARCHAR(50)
)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SELECT 'error' AS status, 'Database error during user creation' AS message;
  END;

  START TRANSACTION;
  IF EXISTS(SELECT 1 FROM users WHERE username = p_username OR email = p_email OR employeeNumber = p_employeeNumber) THEN
    ROLLBACK;
    SELECT 'exists' AS status, 'Username, email, or employee number already exists' AS message;
  ELSE
    INSERT INTO users
      (firstName, lastName, username, email, password, employeeNumber, position, contactNumber, company, department, role)
    VALUES
      (p_firstName, p_lastName, p_username, p_email, p_password, p_employeeNumber, p_position, p_contactNumber, p_company, p_department, COALESCE(p_role, 'user'));
    COMMIT;
    SELECT 'ok' AS status, 'User created' AS message, users_id AS insertedId FROM users WHERE username = p_username;
  END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_decline_job_order` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_decline_job_order`(
  IN p_job_orders_id CHAR(36),
  IN p_declined_by CHAR(36),
  IN p_decline_reason TEXT
)
BEGIN
  UPDATE job_orders SET
    status = 'declined',
    declined_by_id = p_declined_by,
    decline_reason = p_decline_reason,
    updated_at = NOW()
  WHERE job_orders_id = p_job_orders_id AND deleted_at IS NULL;

  -- Return the updated record
  SELECT
    job_orders_id AS id, job_order_id AS jobOrderId,
    requestor, requestor_department AS requestorDepartment,
    requestor_company AS requestorCompany,
    requestor_email AS requestorEmail,
    requestor_contact_number AS requestorContactNumber,
    company, department, billed_to AS billedTo,
    date_needed AS dateNeeded,
    subject, description, categories, remarks,
    date_submitted AS dateSubmitted,
    status,
    created_at AS createdAt,
    updated_at AS updatedAt,
    decline_reason, approved_by_id, declined_by_id,
    received_at, action_done_at, completed_at
  FROM job_orders
  WHERE job_orders_id = p_job_orders_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_delete_job_order` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_delete_job_order`(IN p_job_orders_id CHAR(36))
BEGIN
    DELETE FROM job_orders WHERE job_orders_id = p_job_orders_id;
    SELECT ROW_COUNT() AS affectedRows;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_job_order_by_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_job_order_by_id`(IN p_job_orders_id CHAR(36))
BEGIN
  SELECT
    job_orders_id AS id,
    job_order_id AS jobOrderId,
    requestor,
    requestor_department AS requestorDepartment,
    requestor_company AS requestorCompany,
    requestor_position AS requestorPosition,
    requestor_email AS requestorEmail,
    requestor_contact_number AS requestorContactNumber,
    company,
    department,
    billed_to AS billedTo,
    date_needed AS dateNeeded,
    subject,
    description,
    categories,
    remarks,
    date_submitted AS dateSubmitted,
    status,
    created_at AS createdAt,
    updated_at AS updatedAt,
    decline_reason AS declineReason,
    approved_by_id AS approvedBy,
    approved_at AS approvedAt,
    approver_remarks AS approverRemarks,
    declined_by_id AS declinedBy,
    declined_at AS declinedAt,
    received_by_id AS receivedBy,
    received_at AS receivedAt,
    receiver_remarks AS receiverRemarks,
    action_done_at AS actionDoneAt,
    action_done_by_id AS actionDoneBy,
    action_done_remarks AS workRemarks,  -- Added this line
    completed_at AS completedAt,
    acknowledged_at AS acknowledgedAt,
    assigned_to_id AS assignedTo,
    assigned_by_id AS assignedBy,
    assignment_message AS assignmentMessage,
    start_date AS startDate,
    end_date AS endDate
  FROM job_orders
  WHERE job_orders_id = p_job_orders_id
    AND deleted_at IS NULL;

  SELECT
    job_order_attachments_id AS id,
    file_name,
    file_path,
    file_url,
    file_size,
    file_type,
    uploaded_at
  FROM job_order_attachments
  WHERE job_orders_id = p_job_orders_id
    AND EXISTS (
           SELECT 1
           FROM job_orders jo
           WHERE jo.job_orders_id = p_job_orders_id
             AND jo.deleted_at IS NULL
           );
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_refresh_token_by_user_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_refresh_token_by_user_id`(IN p_users_id CHAR(36))
BEGIN
    SELECT
        users_id AS id,
        username,
        email,
        refreshToken
    FROM users
    WHERE users_id = p_users_id
    LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_role_based_job_orders` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_role_based_job_orders`(
  IN p_user_id CHAR(36),
  IN p_user_role VARCHAR(50),
  IN p_user_department VARCHAR(100),
  IN p_user_company VARCHAR(100)
)
BEGIN
  IF p_user_role = 'admin' THEN
    -- Admin sees ALL job orders
    SELECT
      job_orders_id AS id, job_order_id AS jobOrderId, requestor,
      requestor_department AS requestorDepartment, requestor_company AS requestorCompany,
      requestor_email AS requestorEmail, requestor_contact_number AS requestorContactNumber,
      company, department, billed_to AS billedTo, date_needed AS dateNeeded,
      subject, description, categories, remarks, date_submitted AS dateSubmitted,
      status, created_at AS createdAt, updated_at AS updatedAt,
      decline_reason AS declineReason, approved_by_id AS approvedBy,
      approved_at AS approvedAt, approver_remarks AS approverRemarks,
      declined_by_id AS declinedBy, declined_at AS declinedAt,
      received_by_id AS receivedBy, received_at AS receivedAt,
      receiver_remarks AS receiverRemarks, action_done_at AS actionDoneAt,
      action_done_by_id AS actionDoneBy, action_done_by_name AS actionDoneByName,
      action_done_remarks AS workRemarks, completed_at AS completedAt,
      acknowledged_at AS acknowledgedAt, assigned_to_id AS assignedTo,
      assigned_by_id AS assignedBy, assignment_message AS assignmentMessage,
      start_date AS startDate, end_date AS endDate
    FROM job_orders WHERE deleted_at IS NULL ORDER BY date_submitted DESC;

  ELSEIF p_user_role = 'dept_head' THEN
    -- CORRECTED: Dept_Head's Approval Page should ONLY show:
    -- Pending job orders FROM their SAME company AND SAME department (requestor's department)
    -- 
    -- IMPORTANT: This fixes the cross-department approval flow issue
    -- User from IT/BCGI submits to Legal/CMTH → IT Dept Head (requestor's Dept Head) sees it for approval
    -- NOT Legal Dept Head (target department's Dept Head)
    -- 
    -- ALSO: Show job orders that were approved by this Dept Head (for tracking)
    SELECT
      job_orders_id AS id, job_order_id AS jobOrderId, requestor,
      requestor_department AS requestorDepartment, requestor_company AS requestorCompany,
      requestor_email AS requestorEmail, requestor_contact_number AS requestorContactNumber,
      company, department, billed_to AS billedTo, date_needed AS dateNeeded,
      subject, description, categories, remarks, date_submitted AS dateSubmitted,
      status, created_at AS createdAt, updated_at AS updatedAt,
      decline_reason AS declineReason, approved_by_id AS approvedBy,
      approved_at AS approvedAt, approver_remarks AS approverRemarks,
      declined_by_id AS declinedBy, declined_at AS declinedAt,
      received_by_id AS receivedBy, received_at AS receivedAt,
      receiver_remarks AS receiverRemarks, action_done_at AS actionDoneAt,
      action_done_by_id AS actionDoneBy, action_done_by_name AS actionDoneByName,
      action_done_remarks AS workRemarks, completed_at AS completedAt,
      acknowledged_at AS acknowledgedAt, assigned_to_id AS assignedTo,
      assigned_by_id AS assignedBy, assignment_message AS assignmentMessage,
      start_date AS startDate, end_date AS endDate
    FROM job_orders
    WHERE deleted_at IS NULL
      AND (
        -- Show pending job orders FROM requestor's department/company (for approval)
        (requestor_department = p_user_department 
         AND requestor_company = p_user_company 
         AND status = 'pending')
        OR
        -- Show job orders that were approved by this Dept Head (for tracking)
        (approved_by_id = p_user_id)
      )
    ORDER BY date_submitted DESC;

  ELSEIF p_user_role = 'receiver' THEN
    -- Receiver sees:
    -- Approved job orders from their SAME company AND SAME department (target company/department)
    -- This ensures only the target department can receive approved requests
    SELECT
      job_orders_id AS id, job_order_id AS jobOrderId, requestor,
      requestor_department AS requestorDepartment, requestor_company AS requestorCompany,
      requestor_email AS requestorEmail, requestor_contact_number AS requestorContactNumber,
      company, department, billed_to AS billedTo, date_needed AS dateNeeded,
      subject, description, categories, remarks, date_submitted AS dateSubmitted,
      status, created_at AS createdAt, updated_at AS updatedAt,
      decline_reason AS declineReason, approved_by_id AS approvedBy,
      approved_at AS approvedAt, approver_remarks AS approverRemarks,
      declined_by_id AS declinedBy, declined_at AS declinedAt,
      received_by_id AS receivedBy, received_at AS receivedAt,
      receiver_remarks AS receiverRemarks, action_done_at AS actionDoneAt,
      action_done_by_id AS actionDoneBy, action_done_by_name AS actionDoneByName,
      action_done_remarks AS workRemarks, completed_at AS completedAt,
      acknowledged_at AS acknowledgedAt, assigned_to_id AS assignedTo,
      assigned_by_id AS assignedBy, assignment_message AS assignmentMessage,
      start_date AS startDate, end_date AS endDate
    FROM job_orders
    WHERE deleted_at IS NULL
      AND company = p_user_company
      AND department = p_user_department
      AND status = 'approved'
    ORDER BY date_submitted DESC;

  ELSEIF p_user_role = 'assigned_worker' THEN
    -- Assigned Worker sees:
    -- Job orders assigned to them (regardless of company/department)
    SELECT
      job_orders_id AS id, job_order_id AS jobOrderId, requestor,
      requestor_department AS requestorDepartment, requestor_company AS requestorCompany,
      requestor_email AS requestorEmail, requestor_contact_number AS requestorContactNumber,
      company, department, billed_to AS billedTo, date_needed AS dateNeeded,
      subject, description, categories, remarks, date_submitted AS dateSubmitted,
      status, created_at AS createdAt, updated_at AS updatedAt,
      decline_reason AS declineReason, approved_by_id AS approvedBy,
      approved_at AS approvedAt, approver_remarks AS approverRemarks,
      declined_by_id AS declinedBy, declined_at AS declinedAt,
      received_by_id AS receivedBy, received_at AS receivedAt,
      receiver_remarks AS receiverRemarks, action_done_at AS actionDoneAt,
      action_done_by_id AS actionDoneBy, action_done_by_name AS actionDoneByName,
      action_done_remarks AS workRemarks, completed_at AS completedAt,
      acknowledged_at AS acknowledgedAt, assigned_to_id AS assignedTo,
      assigned_by_id AS assignedBy, assignment_message AS assignmentMessage,
      start_date AS startDate, end_date AS endDate
    FROM job_orders
    WHERE deleted_at IS NULL
      AND assigned_to_id = p_user_id
      AND status IN ('assigned', 'ongoing', 'action_done')
    ORDER BY date_submitted DESC;

  ELSE
    -- Regular User sees:
    -- Their own job orders (by email) - regardless of company/department
    -- They can only see what they created
    SELECT
      job_orders_id AS id, job_order_id AS jobOrderId, requestor,
      requestor_department AS requestorDepartment, requestor_company AS requestorCompany,
      requestor_email AS requestorEmail, requestor_contact_number AS requestorContactNumber,
      company, department, billed_to AS billedTo, date_needed AS dateNeeded,
      subject, description, categories, remarks, date_submitted AS dateSubmitted,
      status, created_at AS createdAt, updated_at AS updatedAt,
      decline_reason AS declineReason, approved_by_id AS approvedBy,
      approved_at AS approvedAt, approver_remarks AS approverRemarks,
      declined_by_id AS declinedBy, declined_at AS declinedAt,
      received_by_id AS receivedBy, received_at AS receivedAt,
      receiver_remarks AS receiverRemarks, action_done_at AS actionDoneAt,
      action_done_by_id AS actionDoneBy, action_done_by_name AS actionDoneByName,
      action_done_remarks AS workRemarks, completed_at AS completedAt,
      acknowledged_at AS acknowledgedAt, assigned_to_id AS assignedTo,
      assigned_by_id AS assignedBy, assignment_message AS assignmentMessage,
      start_date AS startDate, end_date AS endDate
    FROM job_orders
    WHERE deleted_at IS NULL
      AND requestor_email IN (SELECT email FROM users WHERE users_id = p_user_id)
    ORDER BY date_submitted DESC;
  END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_user_by_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_user_by_id`(IN in_users_id VARCHAR(36))
BEGIN
  SELECT users_id AS id, firstName, lastName, username, email, employeeNumber, position, contactNumber, company, department, role
  FROM users WHERE users_id = in_users_id LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_get_user_by_identifier` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_user_by_identifier`(
  IN in_identifier VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
)
BEGIN
  SELECT users_id AS id, firstName, lastName, username, email, employeeNumber, position, contactNumber, company, department, password, role FROM users
  WHERE username = in_identifier
     OR email = in_identifier
     OR employeeNumber = in_identifier
  LIMIT 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_remove_worker_role` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_remove_worker_role`(
    IN p_users_id CHAR(36)
)
BEGIN
    -- Update the user's role back to 'user'
    UPDATE users SET role = 'user' WHERE users_id = p_users_id;

    -- Return success
    SELECT 'success' AS status, 'Worker role removed' AS message;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_set_default_permissions` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_set_default_permissions`(
  IN p_user_id CHAR(36)
)
BEGIN
  DECLARE v_role VARCHAR(50);
  DECLARE v_company VARCHAR(100);
  DECLARE v_department VARCHAR(100);
  
  -- Get user role and other details
  SELECT role, company, department INTO v_role, v_company, v_department
  FROM users 
  WHERE users_id = p_user_id;
  
  -- If user not found, exit
  IF v_role IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User not found';
  END IF;
  
  -- Delete any existing permissions for this user (in case of role change)
  DELETE FROM user_permissions WHERE user_id = p_user_id;
  
  -- Set default permissions based on role
  CASE v_role
    WHEN 'admin' THEN
      -- Admin gets full access to all modules
      INSERT INTO user_permissions (user_id, module_name, permission_type, granted) VALUES
        (p_user_id, 'Dashboard', 'view', 1),
        (p_user_id, 'Dashboard', 'create', 1),
        (p_user_id, 'Dashboard', 'edit', 1),
        (p_user_id, 'Dashboard', 'delete', 1),
        (p_user_id, 'Job Orders', 'view', 1),
        (p_user_id, 'Job Orders', 'create', 1),
        (p_user_id, 'Job Orders', 'edit', 1),
        (p_user_id, 'Job Orders', 'delete', 1),
        (p_user_id, 'Job Order Request', 'view', 1),
        (p_user_id, 'Job Order Request', 'create', 1),
        (p_user_id, 'Job Order Request', 'edit', 1),
        (p_user_id, 'Job Order Request', 'delete', 1),
        (p_user_id, 'Request Approval', 'view', 1),
        (p_user_id, 'Request Approval', 'create', 1),
        (p_user_id, 'Request Approval', 'edit', 1),
        (p_user_id, 'Request Approval', 'delete', 1),
        (p_user_id, 'Received Request', 'view', 1),
        (p_user_id, 'Received Request', 'create', 1),
        (p_user_id, 'Received Request', 'edit', 1),
        (p_user_id, 'Received Request', 'delete', 1),
        (p_user_id, 'My Assigned Work', 'view', 1),
        (p_user_id, 'My Assigned Work', 'create', 1),
        (p_user_id, 'My Assigned Work', 'edit', 1),
        (p_user_id, 'My Assigned Work', 'delete', 1),
        (p_user_id, 'Users', 'view', 1),
        (p_user_id, 'Users', 'create', 1),
        (p_user_id, 'Users', 'edit', 1),
        (p_user_id, 'Users', 'delete', 1),
        (p_user_id, 'View Users', 'view', 1),
        (p_user_id, 'View Users', 'create', 1),
        (p_user_id, 'View Users', 'edit', 1),
        (p_user_id, 'View Users', 'delete', 1),
        (p_user_id, 'Manage Permissions', 'view', 1),
        (p_user_id, 'Manage Permissions', 'create', 1),
        (p_user_id, 'Manage Permissions', 'edit', 1),
        (p_user_id, 'Manage Permissions', 'delete', 1),
        (p_user_id, 'Audit Trail', 'view', 1),
        (p_user_id, 'Audit Trail', 'create', 1),
        (p_user_id, 'Audit Trail', 'edit', 1),
        (p_user_id, 'Audit Trail', 'delete', 1),
        (p_user_id, 'Settings', 'view', 1),
        (p_user_id, 'Settings', 'create', 1),
        (p_user_id, 'Settings', 'edit', 1),
        (p_user_id, 'Settings', 'delete', 1);
        
    WHEN 'dept_head' THEN
      -- Department head gets access to Dashboard, Job Order Request, Request Approval, Settings
      INSERT INTO user_permissions (user_id, module_name, permission_type, granted) VALUES
        (p_user_id, 'Dashboard', 'view', 1),
        (p_user_id, 'Dashboard', 'create', 1),
        (p_user_id, 'Dashboard', 'edit', 1),
        (p_user_id, 'Dashboard', 'delete', 1),
        (p_user_id, 'Job Order Request', 'view', 1),
        (p_user_id, 'Job Order Request', 'create', 1),
        (p_user_id, 'Job Order Request', 'edit', 1),
        (p_user_id, 'Job Order Request', 'delete', 1),
        (p_user_id, 'Request Approval', 'view', 1),
        (p_user_id, 'Request Approval', 'create', 1),
        (p_user_id, 'Request Approval', 'edit', 1),
        (p_user_id, 'Request Approval', 'delete', 1),
        (p_user_id, 'Settings', 'view', 1),
        (p_user_id, 'Settings', 'create', 1),
        (p_user_id, 'Settings', 'edit', 1),
        (p_user_id, 'Settings', 'delete', 1);
        
    WHEN 'receiver' THEN
      -- Receiver gets access to Dashboard, Job Order Request, Received Request, Settings
      INSERT INTO user_permissions (user_id, module_name, permission_type, granted) VALUES
        (p_user_id, 'Dashboard', 'view', 1),
        (p_user_id, 'Dashboard', 'create', 1),
        (p_user_id, 'Dashboard', 'edit', 1),
        (p_user_id, 'Dashboard', 'delete', 1),
        (p_user_id, 'Job Order Request', 'view', 1),
        (p_user_id, 'Job Order Request', 'create', 1),
        (p_user_id, 'Job Order Request', 'edit', 1),
        (p_user_id, 'Job Order Request', 'delete', 1),
        (p_user_id, 'Received Request', 'view', 1),
        (p_user_id, 'Received Request', 'create', 1),
        (p_user_id, 'Received Request', 'edit', 1),
        (p_user_id, 'Received Request', 'delete', 1),
        (p_user_id, 'Settings', 'view', 1),
        (p_user_id, 'Settings', 'create', 1),
        (p_user_id, 'Settings', 'edit', 1),
        (p_user_id, 'Settings', 'delete', 1);
        
    WHEN 'assigned_worker' THEN
      -- Assigned worker gets access to Dashboard, My Assigned Work, Settings
      INSERT INTO user_permissions (user_id, module_name, permission_type, granted) VALUES
        (p_user_id, 'Dashboard', 'view', 1),
        (p_user_id, 'Dashboard', 'create', 1),
        (p_user_id, 'Dashboard', 'edit', 1),
        (p_user_id, 'Dashboard', 'delete', 1),
        (p_user_id, 'My Assigned Work', 'view', 1),
        (p_user_id, 'My Assigned Work', 'create', 1),
        (p_user_id, 'My Assigned Work', 'edit', 1),
        (p_user_id, 'My Assigned Work', 'delete', 1),
        (p_user_id, 'Settings', 'view', 1),
        (p_user_id, 'Settings', 'create', 1),
        (p_user_id, 'Settings', 'edit', 1),
        (p_user_id, 'Settings', 'delete', 1);
        
    ELSE
      -- Default role (user) gets access to Dashboard, Job Order Request, Settings
      INSERT INTO user_permissions (user_id, module_name, permission_type, granted) VALUES
        (p_user_id, 'Dashboard', 'view', 1),
        (p_user_id, 'Dashboard', 'create', 1),
        (p_user_id, 'Dashboard', 'edit', 1),
        (p_user_id, 'Dashboard', 'delete', 1),
        (p_user_id, 'Job Order Request', 'view', 1),
        (p_user_id, 'Job Order Request', 'create', 1),
        (p_user_id, 'Job Order Request', 'edit', 1),
        (p_user_id, 'Job Order Request', 'delete', 1),
        (p_user_id, 'Settings', 'view', 1),
        (p_user_id, 'Settings', 'create', 1),
        (p_user_id, 'Settings', 'edit', 1),
        (p_user_id, 'Settings', 'delete', 1);
  END CASE;
  
  -- Return success
  SELECT 'success' AS status, CONCAT('Default permissions set for role: ', v_role) AS message;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_set_refresh_token` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_set_refresh_token`(IN in_users_id CHAR(36), IN in_refreshToken VARCHAR(512))
BEGIN
  UPDATE users SET refreshToken = in_refreshToken WHERE users_id = in_users_id;
  SELECT ROW_COUNT() AS affected;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_update_job_order` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_job_order`(
  IN p_job_orders_id CHAR(36),
  IN p_requestor VARCHAR(255),
  IN p_requestor_department VARCHAR(255),
  IN p_requestor_company VARCHAR(255),
  IN p_requestor_position VARCHAR(255),
  IN p_requestor_email VARCHAR(255),
  IN p_requestor_contact_number VARCHAR(50),
  IN p_company VARCHAR(255),
  IN p_department VARCHAR(255),
  IN p_billed_to VARCHAR(255),
  IN p_date_needed DATE,
  IN p_subject VARCHAR(500),
  IN p_description TEXT,
  IN p_categories JSON,
  IN p_remarks TEXT,
  IN p_status VARCHAR(20),
  IN p_decline_reason TEXT,
  IN p_approved_by CHAR(36),
  IN p_declined_by CHAR(36),
  IN p_received_at DATETIME,
  IN p_action_done_at DATETIME,
  IN p_completed_at DATETIME
)
BEGIN
  UPDATE job_orders SET
    requestor = p_requestor,
    requestor_department = p_requestor_department,
    requestor_company = p_requestor_company,
    requestor_position = p_requestor_position,
    requestor_email = p_requestor_email,
    requestor_contact_number = COALESCE(p_requestor_contact_number, 'N/A'),
    company = p_company,
    department = p_department,
    billed_to = p_billed_to,
    date_needed = p_date_needed,
    subject = p_subject,
    description = p_description,
    categories = p_categories,
    remarks = p_remarks,
    status = p_status,
    decline_reason = p_decline_reason,
    approved_by_id = p_approved_by,
    declined_by_id = p_declined_by,
    received_at = p_received_at,
    action_done_at = p_action_done_at,
    completed_at = p_completed_at,
    updated_at = NOW()
  WHERE job_orders_id = p_job_orders_id;

  SELECT
    job_orders_id AS id, job_order_id AS jobOrderId,
    requestor, requestor_department AS requestorDepartment,
    requestor_company AS requestorCompany,
    requestor_position AS requestorPosition,
    requestor_email AS requestorEmail,
    requestor_contact_number AS requestorContactNumber,
    company, department, billed_to AS billedTo,
    date_needed AS dateNeeded,
    subject, description, categories, remarks,
    date_submitted AS dateSubmitted,
    status,
    created_at AS createdAt,
    updated_at AS updatedAt,
    decline_reason, approved_by_id, declined_by_id,
    received_at, action_done_at, completed_at
  FROM job_orders
  WHERE job_orders_id = p_job_orders_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_update_job_order_status` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_job_order_status`(
    IN p_job_orders_id CHAR(36),
    IN p_status ENUM('draft','pending','approved','received','in_progress','action_done','completed','declined','assigned','ongoing','waiting_confirmation','acknowledged','complete'),
    IN p_users_id CHAR(36),
    IN p_decline_reason TEXT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    UPDATE job_orders SET
        status = p_status,
        updated_at = NOW(),

        -- Auto set timestamps
        received_at     = IF(p_status = 'received',     NOW(), received_at),
        action_done_at  = IF(p_status = 'action_done',  NOW(), action_done_at),
        completed_at    = IF(p_status = 'completed',    NOW(), completed_at),

        -- Auto set user
        approved_by_id     = IF(p_status = 'received',     p_users_id, approved_by_id),
        declined_by_id     = IF(p_status = 'declined',     p_users_id, declined_by_id),

        -- Save decline reason only when declining
        decline_reason  = IF(p_status = 'declined', p_decline_reason, decline_reason)

    WHERE job_orders_id = p_job_orders_id AND deleted_at IS NULL;

    -- Return the full updated record
    SELECT * FROM job_orders WHERE job_orders_id = p_job_orders_id;

    COMMIT;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_update_job_order_with_audit` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_job_order_with_audit`(
  IN p_job_orders_id CHAR(36),
  IN p_user_id CHAR(36),
  IN p_user_name VARCHAR(255),
  IN p_action ENUM('create','update','delete','approve','decline','assign','receive','complete','reopen','start_work','mark_action_done','acknowledge'),
  IN p_company VARCHAR(255),
  IN p_department VARCHAR(255),
  IN p_billed_to VARCHAR(255),
  IN p_date_needed DATE,
  IN p_subject VARCHAR(500),
  IN p_description TEXT,
  IN p_categories JSON,
  IN p_remarks TEXT,
  IN p_status VARCHAR(20),
  IN p_decline_reason TEXT,
  IN p_approved_by CHAR(36),
  IN p_approver_remarks TEXT,
  IN p_declined_by CHAR(36),
  IN p_received_by CHAR(36),
  IN p_received_at DATETIME,
  IN p_receiver_remarks TEXT,
  IN p_action_done_at DATETIME,
  IN p_action_done_by CHAR(36),
  IN p_action_done_remarks TEXT,
  IN p_completed_at DATETIME,
  IN p_acknowledged_at DATETIME,
  IN p_assigned_by CHAR(36),
  IN p_assigned_to CHAR(36),
  IN p_assignment_message TEXT,
  IN p_start_date DATE,
  IN p_end_date DATE,
  IN p_ip_address VARCHAR(50),
  IN p_user_agent VARCHAR(255),
  IN p_notes TEXT
)
BEGIN
  DECLARE v_old_values JSON;
  DECLARE v_new_values JSON;
  DECLARE v_current_status VARCHAR(20);

  -- Get current values before update
  SELECT JSON_OBJECT(
    'company', company,
    'department', department,
    'billed_to', billed_to,
    'date_needed', date_needed,
    'subject', subject,
    'description', description,
    'categories', categories,
    'remarks', remarks,
    'status', status,
    'decline_reason', decline_reason,
    'approved_by_id', approved_by_id,
    'approver_remarks', approver_remarks,
    'declined_by_id', declined_by_id,
    'received_by_id', received_by_id,
    'received_at', received_at,
    'receiver_remarks', receiver_remarks,
    'action_done_at', action_done_at,
    'action_done_by_id', action_done_by_id,
    'action_done_remarks', action_done_remarks,
    'completed_at', completed_at,
    'acknowledged_at', acknowledged_at,
    'assigned_to_id', assigned_to_id,
    'assigned_by_id', assigned_by_id,
    'assignment_message', assignment_message,
    'start_date', start_date,
    'end_date', end_date
  ) INTO v_old_values
  FROM job_orders
  WHERE job_orders_id = p_job_orders_id AND deleted_at IS NULL;

  -- Get current status for timestamp logic
  SELECT status INTO v_current_status
  FROM job_orders
  WHERE job_orders_id = p_job_orders_id AND deleted_at IS NULL;

  -- Update the job order (using correct column name: action_done_by_id)
  UPDATE job_orders SET
    company = COALESCE(p_company, company),
    department = COALESCE(p_department, department),
    billed_to = COALESCE(p_billed_to, billed_to),
    date_needed = COALESCE(p_date_needed, date_needed),
    subject = COALESCE(p_subject, subject),
    description = COALESCE(p_description, description),
    categories = COALESCE(p_categories, categories),
    remarks = COALESCE(p_remarks, remarks),
    status = COALESCE(p_status, status),
    decline_reason = COALESCE(p_decline_reason, decline_reason),
    approved_by_id = COALESCE(p_approved_by, approved_by_id),
    approver_remarks = COALESCE(p_approver_remarks, approver_remarks),
    declined_by_id = COALESCE(p_declined_by, declined_by_id),
    received_by_id = COALESCE(p_received_by, received_by_id),
    received_at = COALESCE(p_received_at, received_at),
    receiver_remarks = COALESCE(p_receiver_remarks, receiver_remarks),
    action_done_at = COALESCE(p_action_done_at, action_done_at),
    action_done_by_id = COALESCE(p_action_done_by, action_done_by_id),
    action_done_remarks = COALESCE(p_action_done_remarks, action_done_remarks),
    completed_at = COALESCE(p_completed_at, completed_at),
    acknowledged_at = COALESCE(p_acknowledged_at, acknowledged_at),
    assigned_to_id = COALESCE(p_assigned_to, assigned_to_id),
    assigned_by_id = COALESCE(p_assigned_by, assigned_by_id),
    assignment_message = COALESCE(p_assignment_message, assignment_message),
    start_date = COALESCE(p_start_date, start_date),
    end_date = COALESCE(p_end_date, end_date),
    -- Set timestamps based on status changes
    approved_at = CASE
      WHEN p_status = 'approved' AND v_current_status != 'approved' THEN NOW()
      ELSE approved_at
    END,
    declined_at = CASE
      WHEN p_status = 'declined' AND v_current_status != 'declined' THEN NOW()
      ELSE declined_at
    END,
    assigned_by_id = CASE
      WHEN p_assigned_to IS NOT NULL AND assigned_to_id IS NULL THEN p_user_id
      ELSE assigned_by_id
    END,
    updated_at = NOW()
  WHERE job_orders_id = p_job_orders_id AND deleted_at IS NULL;

  -- Get new values after update
  SELECT JSON_OBJECT(
    'company', company,
    'department', department,
    'billed_to', billed_to,
    'date_needed', date_needed,
    'subject', subject,
    'description', description,
    'categories', categories,
    'remarks', remarks,
    'status', status,
    'decline_reason', decline_reason,
    'approved_by_id', approved_by_id,
    'approver_remarks', approver_remarks,
    'declined_by_id', declined_by_id,
    'received_by_id', received_by_id,
    'received_at', received_at,
    'receiver_remarks', receiver_remarks,
    'action_done_at', action_done_at,
    'action_done_by_id', action_done_by_id,
    'action_done_remarks', action_done_remarks,
    'completed_at', completed_at,
    'acknowledged_at', acknowledged_at,
    'assigned_to_id', assigned_to_id,
    'assigned_by_id', assigned_by_id,
    'assignment_message', assignment_message,
    'start_date', start_date,
    'end_date', end_date
  ) INTO v_new_values
  FROM job_orders
  WHERE job_orders_id = p_job_orders_id AND deleted_at IS NULL;

  -- Insert audit log
  INSERT INTO job_orders_audit_log (
    job_order_id,
    user_id,
    user_name,
    action,
    old_values,
    new_values,
    ip_address,
    user_agent,
    notes
  ) VALUES (
    p_job_orders_id,
    p_user_id,
    p_user_name,
    p_action,
    v_old_values,
    v_new_values,
    p_ip_address,
    p_user_agent,
    p_notes
  );

  -- Return the updated job order
  SELECT
    job_orders_id AS id,
    job_order_id AS jobOrderId,
    requestor,
    requestor_department AS requestorDepartment,
    requestor_company AS requestorCompany,
    requestor_email AS requestorEmail,
    requestor_contact_number AS requestorContactNumber,
    company,
    department,
    billed_to AS billedTo,
    date_needed AS dateNeeded,
    subject,
    description,
    categories,
    remarks,
    date_submitted AS dateSubmitted,
    status,
    created_at AS createdAt,
    updated_at AS updatedAt,
    decline_reason,
    approved_by_id AS approvedBy,
    approved_at AS approvedAt,
    approver_remarks AS approverRemarks,
    declined_by_id AS declinedBy,
    declined_at AS declinedAt,
    received_by_id AS receivedBy,
    received_at AS receivedAt,
    receiver_remarks AS receiverRemarks,
    action_done_at AS actionDoneAt,
    action_done_by_id AS actionDoneBy,
    action_done_remarks AS workRemarks,
    completed_at AS completedAt,
    acknowledged_at AS acknowledgedAt,
    assigned_to_id AS assignedTo,
    assigned_by_id AS assignedBy,
    assignment_message AS assignmentMessage,
    start_date AS startDate,
    end_date AS endDate
  FROM job_orders
  WHERE job_orders_id = p_job_orders_id AND deleted_at IS NULL;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_update_user_permissions_on_role_change` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb3 */ ;
/*!50003 SET character_set_results = utf8mb3 */ ;
/*!50003 SET collation_connection  = utf8mb3_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_user_permissions_on_role_change`(
  IN p_user_id CHAR(36),
  IN p_new_role VARCHAR(50)
)
BEGIN
  DECLARE v_old_role VARCHAR(50);
  DECLARE v_company VARCHAR(100);
  DECLARE v_department VARCHAR(100);
  
  -- Get current user role and other details
  SELECT role, company, department INTO v_old_role, v_company, v_department
  FROM users 
  WHERE users_id = p_user_id;
  
  -- If user not found, exit
  IF v_old_role IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User not found';
  END IF;
  
  -- Update the user's role
  UPDATE users SET role = p_new_role WHERE users_id = p_user_id;
  
  -- Delete existing permissions for this user
  DELETE FROM user_permissions WHERE user_id = p_user_id;
  
  -- Set new permissions based on the new role
  CASE p_new_role
    WHEN 'admin' THEN
      -- Admin gets full access to all modules
      INSERT INTO user_permissions (user_id, module_name, permission_type, granted) VALUES
        (p_user_id, 'Dashboard', 'view', 1),
        (p_user_id, 'Dashboard', 'create', 1),
        (p_user_id, 'Dashboard', 'edit', 1),
        (p_user_id, 'Dashboard', 'delete', 1),
        (p_user_id, 'Job Orders', 'view', 1),
        (p_user_id, 'Job Orders', 'create', 1),
        (p_user_id, 'Job Orders', 'edit', 1),
        (p_user_id, 'Job Orders', 'delete', 1),
        (p_user_id, 'Job Order Request', 'view', 1),
        (p_user_id, 'Job Order Request', 'create', 1),
        (p_user_id, 'Job Order Request', 'edit', 1),
        (p_user_id, 'Job Order Request', 'delete', 1),
        (p_user_id, 'Request Approval', 'view', 1),
        (p_user_id, 'Request Approval', 'create', 1),
        (p_user_id, 'Request Approval', 'edit', 1),
        (p_user_id, 'Request Approval', 'delete', 1),
        (p_user_id, 'Received Request', 'view', 1),
        (p_user_id, 'Received Request', 'create', 1),
        (p_user_id, 'Received Request', 'edit', 1),
        (p_user_id, 'Received Request', 'delete', 1),
        (p_user_id, 'My Assigned Work', 'view', 1),
        (p_user_id, 'My Assigned Work', 'create', 1),
        (p_user_id, 'My Assigned Work', 'edit', 1),
        (p_user_id, 'My Assigned Work', 'delete', 1),
        (p_user_id, 'Users', 'view', 1),
        (p_user_id, 'Users', 'create', 1),
        (p_user_id, 'Users', 'edit', 1),
        (p_user_id, 'Users', 'delete', 1),
        (p_user_id, 'View Users', 'view', 1),
        (p_user_id, 'View Users', 'create', 1),
        (p_user_id, 'View Users', 'edit', 1),
        (p_user_id, 'View Users', 'delete', 1),
        (p_user_id, 'Manage Permissions', 'view', 1),
        (p_user_id, 'Manage Permissions', 'create', 1),
        (p_user_id, 'Manage Permissions', 'edit', 1),
        (p_user_id, 'Manage Permissions', 'delete', 1),
        (p_user_id, 'Audit Trail', 'view', 1),
        (p_user_id, 'Audit Trail', 'create', 1),
        (p_user_id, 'Audit Trail', 'edit', 1),
        (p_user_id, 'Audit Trail', 'delete', 1),
        (p_user_id, 'Settings', 'view', 1),
        (p_user_id, 'Settings', 'create', 1),
        (p_user_id, 'Settings', 'edit', 1),
        (p_user_id, 'Settings', 'delete', 1);
        
    WHEN 'dept_head' THEN
      -- Department head gets access to Dashboard, Job Order Request, Request Approval, Settings
      INSERT INTO user_permissions (user_id, module_name, permission_type, granted) VALUES
        (p_user_id, 'Dashboard', 'view', 1),
        (p_user_id, 'Dashboard', 'create', 1),
        (p_user_id, 'Dashboard', 'edit', 1),
        (p_user_id, 'Dashboard', 'delete', 1),
        (p_user_id, 'Job Order Request', 'view', 1),
        (p_user_id, 'Job Order Request', 'create', 1),
        (p_user_id, 'Job Order Request', 'edit', 1),
        (p_user_id, 'Job Order Request', 'delete', 1),
        (p_user_id, 'Request Approval', 'view', 1),
        (p_user_id, 'Request Approval', 'create', 1),
        (p_user_id, 'Request Approval', 'edit', 1),
        (p_user_id, 'Request Approval', 'delete', 1),
        (p_user_id, 'Settings', 'view', 1),
        (p_user_id, 'Settings', 'create', 1),
        (p_user_id, 'Settings', 'edit', 1),
        (p_user_id, 'Settings', 'delete', 1);
        
    WHEN 'receiver' THEN
      -- Receiver gets access to Dashboard, Job Order Request, Received Request, Settings
      INSERT INTO user_permissions (user_id, module_name, permission_type, granted) VALUES
        (p_user_id, 'Dashboard', 'view', 1),
        (p_user_id, 'Dashboard', 'create', 1),
        (p_user_id, 'Dashboard', 'edit', 1),
        (p_user_id, 'Dashboard', 'delete', 1),
        (p_user_id, 'Job Order Request', 'view', 1),
        (p_user_id, 'Job Order Request', 'create', 1),
        (p_user_id, 'Job Order Request', 'edit', 1),
        (p_user_id, 'Job Order Request', 'delete', 1),
        (p_user_id, 'Received Request', 'view', 1),
        (p_user_id, 'Received Request', 'create', 1),
        (p_user_id, 'Received Request', 'edit', 1),
        (p_user_id, 'Received Request', 'delete', 1),
        (p_user_id, 'Settings', 'view', 1),
        (p_user_id, 'Settings', 'create', 1),
        (p_user_id, 'Settings', 'edit', 1),
        (p_user_id, 'Settings', 'delete', 1);
        
    WHEN 'assigned_worker' THEN
      -- Assigned worker gets access to Dashboard, My Assigned Work, Settings
      INSERT INTO user_permissions (user_id, module_name, permission_type, granted) VALUES
        (p_user_id, 'Dashboard', 'view', 1),
        (p_user_id, 'Dashboard', 'create', 1),
        (p_user_id, 'Dashboard', 'edit', 1),
        (p_user_id, 'Dashboard', 'delete', 1),
        (p_user_id, 'My Assigned Work', 'view', 1),
        (p_user_id, 'My Assigned Work', 'create', 1),
        (p_user_id, 'My Assigned Work', 'edit', 1),
        (p_user_id, 'My Assigned Work', 'delete', 1),
        (p_user_id, 'Settings', 'view', 1),
        (p_user_id, 'Settings', 'create', 1),
        (p_user_id, 'Settings', 'edit', 1),
        (p_user_id, 'Settings', 'delete', 1);
        
    ELSE
      -- Default role (user) gets access to Dashboard, Job Order Request, Settings
      INSERT INTO user_permissions (user_id, module_name, permission_type, granted) VALUES
        (p_user_id, 'Dashboard', 'view', 1),
        (p_user_id, 'Dashboard', 'create', 1),
        (p_user_id, 'Dashboard', 'edit', 1),
        (p_user_id, 'Dashboard', 'delete', 1),
        (p_user_id, 'Job Order Request', 'view', 1),
        (p_user_id, 'Job Order Request', 'create', 1),
        (p_user_id, 'Job Order Request', 'edit', 1),
        (p_user_id, 'Job Order Request', 'delete', 1),
        (p_user_id, 'Settings', 'view', 1),
        (p_user_id, 'Settings', 'create', 1),
        (p_user_id, 'Settings', 'edit', 1),
        (p_user_id, 'Settings', 'delete', 1);
  END CASE;
  
  -- Return success
  SELECT 'success' AS status, CONCAT('Permissions updated for role change from ', v_old_role, ' to ', p_new_role) AS message;
END ;;
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

-- Dump completed on 2026-03-09  7:41:51
