import { pool } from '../db.js';
import logger from '../logger.js';

export async function createAssetChecklist(data: {
  id: string;
  formNumber: string;
  assignmentId: string;
  employeeId: string;
  employeeName: string;
  employeeDesignation?: string | null;
  employeeDepartment?: string | null;
  employeeCompany?: string | null;
  typeOnboarding: number;
  typeOffboarding: number;
  receivedBy?: string | null;
  checklistData: any;
  remarks?: string | null;
  createdBy: string;
}) {
  const {
    id,
    formNumber,
    assignmentId,
    employeeId,
    employeeName,
    employeeDesignation,
    employeeDepartment,
    employeeCompany,
    typeOnboarding,
    typeOffboarding,
    receivedBy,
    checklistData,
    remarks,
    createdBy,
  } = data;

  const query = `
    INSERT INTO asset_checklists (
      id,
      form_number,
      assignment_id,
      employee_id,
      employee_name,
      employee_designation,
      employee_department,
      employee_company,
      type_onboarding,
      type_offboarding,
      received_by,
      checklist_data,
      remarks,
      created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    id,
    formNumber,
    assignmentId,
    employeeId,
    employeeName,
    employeeDesignation || null,
    employeeDepartment || null,
    employeeCompany || null,
    typeOnboarding ? 1 : 0,
    typeOffboarding ? 1 : 0,
    receivedBy || null,
    JSON.stringify(checklistData),
    remarks || null,
    createdBy,
  ];

  try {
    await pool.query(query, values);
    logger.info(`Asset checklist created with ID: ${id}`);
    return id;
  } catch (error) {
    logger.error('Failed to create asset checklist:', error);
    throw error;
  }
}

export async function getChecklistByAssignmentId(assignmentId: string) {
  const query = `
    SELECT 
      ac.id,
      ac.form_number,
      ac.assignment_id,
      ac.employee_id,
      ac.employee_name,
      ac.employee_designation,
      ac.employee_department,
      ac.employee_company,
      ac.type_onboarding,
      ac.type_offboarding,
      ac.received_by,
      ac.checklist_data,
      ac.remarks,
      ac.created_at,
      ac.created_by,
      u.name AS creator_name,
      u.digital_signature AS creator_digital_signature,
      c.logo_url AS employee_company_logo_url
    FROM asset_checklists ac
    LEFT JOIN users u ON ac.created_by = u.userID
    LEFT JOIN companies c ON ac.employee_company = c.name AND c.deleted_at IS NULL
    WHERE ac.assignment_id = ?
    ORDER BY ac.created_at DESC
    LIMIT 1
  `;

  try {
    const [rows] = await pool.query(query, [assignmentId]);
    const checklists = rows as any[];
    
    if (checklists.length === 0) {
      return null;
    }

    const checklist = checklists[0];
    return {
      ...checklist,
      type_onboarding: checklist.type_onboarding === 1,
      type_offboarding: checklist.type_offboarding === 1,
      checklist_data: typeof checklist.checklist_data === 'string' 
        ? JSON.parse(checklist.checklist_data) 
        : checklist.checklist_data,
    };
  } catch (error) {
    logger.error('Failed to get checklist by assignment ID:', error);
    throw error;
  }
}
