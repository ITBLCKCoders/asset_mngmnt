import { pool } from '../db.js';
import logger from '../logger.js';

let employeeSignColumnsAvailable: boolean | null = null;
let deptHeadSignColumnsAvailable: boolean | null = null;

async function columnExists(columnName: string): Promise<boolean> {
  const [rows] = (await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'asset_checklists'
       AND COLUMN_NAME = ?`,
    [columnName]
  )) as [{ cnt: number }[], unknown];
  return Number(rows[0]?.cnt ?? 0) > 0;
}

/** Cached check — asset_checklists employee sign columns (migration_add_asset_checklist_employee_sign.sql) */
export async function hasEmployeeSignColumns(): Promise<boolean> {
  if (employeeSignColumnsAvailable === null) {
    try {
      employeeSignColumnsAvailable = await columnExists('employee_signed_at');
    } catch {
      employeeSignColumnsAvailable = false;
    }
  }
  return employeeSignColumnsAvailable;
}

export async function hasDeptHeadSignColumns(): Promise<boolean> {
  if (deptHeadSignColumnsAvailable === null) {
    try {
      deptHeadSignColumnsAvailable = await columnExists('dept_head_signed_at');
    } catch {
      deptHeadSignColumnsAvailable = false;
    }
  }
  return deptHeadSignColumnsAvailable;
}

function buildChecklistSelect(options: {
  includeEmployeeSign: boolean;
  includeDeptHeadSign: boolean;
}): string {
  const { includeEmployeeSign, includeDeptHeadSign } = options;
  const employeeSignFields = includeEmployeeSign
    ? `ac.employee_signed_at,
    ac.employee_digital_signature,`
    : `NULL AS employee_signed_at,
    NULL AS employee_digital_signature,`;
  const deptHeadSignFields = includeDeptHeadSign
    ? `ac.dept_head_signed_at,
    ac.dept_head_signed_by,
    ac.dept_head_digital_signature,
    dh.name AS dept_head_name,`
    : `NULL AS dept_head_signed_at,
    NULL AS dept_head_signed_by,
    NULL AS dept_head_digital_signature,
    NULL AS dept_head_name,`;

  return `
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
    ${employeeSignFields}
    ${deptHeadSignFields}
    u.name AS creator_name,
    u.digital_signature AS creator_digital_signature,
    c.logo_url AS employee_company_logo_url,
    aa.asset_id,
    a.asset_code,
    a.name AS asset_name
  FROM asset_checklists ac
  LEFT JOIN users u ON ac.created_by = u.userID
  LEFT JOIN users dh ON ac.dept_head_signed_by = dh.userID
  LEFT JOIN companies c ON ac.employee_company = c.name AND c.deleted_at IS NULL
  LEFT JOIN asset_assignments aa ON ac.assignment_id = aa.assignmentID
  LEFT JOIN assets a ON aa.asset_id = a.assetID AND a.deleted_at IS NULL
`;
}

async function checklistSelectFlags() {
  const [includeEmployeeSign, includeDeptHeadSign] = await Promise.all([
    hasEmployeeSignColumns(),
    hasDeptHeadSignColumns(),
  ]);
  return { includeEmployeeSign, includeDeptHeadSign };
}

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

function mapChecklistRow(checklist: any) {
  return {
    ...checklist,
    type_onboarding: checklist.type_onboarding === 1,
    type_offboarding: checklist.type_offboarding === 1,
    checklist_data:
      typeof checklist.checklist_data === 'string'
        ? JSON.parse(checklist.checklist_data)
        : checklist.checklist_data,
    asset: checklist.asset_id
      ? {
          id: checklist.asset_id,
          code: checklist.asset_code ?? null,
          name: checklist.asset_name ?? null,
        }
      : null,
  };
}

export async function getChecklistsByAssignmentIds(assignmentIds: string[]) {
  const ids = [...new Set(assignmentIds.filter(id => id != null && String(id).trim() !== ''))];
  if (ids.length === 0) {
    return [];
  }

  const flags = await checklistSelectFlags();
  const placeholders = ids.map(() => '?').join(',');
  const query = `
    ${buildChecklistSelect(flags)}
    WHERE ac.assignment_id IN (${placeholders})
    ORDER BY ac.created_at ASC
  `;

  try {
    const [rows] = await pool.query(query, ids);
    return (rows as any[]).map(mapChecklistRow);
  } catch (error) {
    logger.error('Failed to get checklists by assignment IDs:', error);
    throw error;
  }
}

export async function getChecklistByAssignmentId(assignmentId: string) {
  const flags = await checklistSelectFlags();
  const query = `
    ${buildChecklistSelect(flags)}
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

    return mapChecklistRow(checklists[0]);
  } catch (error) {
    logger.error('Failed to get checklist by assignment ID:', error);
    throw error;
  }
}

export async function signChecklistsAsEmployee(params: {
  checklistIds: string[];
  employeeId: string;
  digitalSignature: string | null;
}): Promise<number> {
  const includeEmployeeSign = await hasEmployeeSignColumns();
  if (!includeEmployeeSign) {
    const err = new Error(
      'employee_signed_at column missing — run db/migration_add_asset_checklist_employee_sign.sql'
    );
    (err as Error & { code?: string }).code = 'SCHEMA_MISSING_EMPLOYEE_SIGN';
    throw err;
  }

  const { checklistIds, employeeId, digitalSignature } = params;
  const ids = [...new Set(checklistIds.filter(id => id?.trim()))];
  if (ids.length === 0) {
    return 0;
  }

  const placeholders = ids.map(() => '?').join(',');
  const query = `
    UPDATE asset_checklists
    SET employee_signed_at = NOW(),
        employee_digital_signature = ?
    WHERE id IN (${placeholders})
      AND employee_id = ?
      AND employee_signed_at IS NULL
  `;

  try {
    const [result] = await pool.query(query, [
      digitalSignature,
      ...ids,
      employeeId,
    ]);
    return (result as { affectedRows?: number }).affectedRows ?? 0;
  } catch (error) {
    logger.error('Failed to sign asset checklists as employee:', error);
    throw error;
  }
}

const PENDING_DEPT_HEAD_CHECKLIST_SQL = `
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
    ac.employee_signed_at,
    ac.employee_digital_signature,
    ac.dept_head_signed_at,
    ac.dept_head_signed_by,
    ac.dept_head_digital_signature,
    u.name AS creator_name,
    u.digital_signature AS creator_digital_signature,
    c.logo_url AS employee_company_logo_url,
    aa.asset_id,
    a.asset_code,
    a.name AS asset_name,
    emp.department_id AS employee_department_id,
    d.name AS employee_department_name
  FROM asset_checklists ac
  INNER JOIN users emp ON ac.employee_id = emp.userID
  LEFT JOIN asset_mngmnt_departments d ON emp.department_id = d.departmentID
  LEFT JOIN users u ON ac.created_by = u.userID
  LEFT JOIN companies c ON ac.employee_company = c.name AND c.deleted_at IS NULL
  LEFT JOIN asset_assignments aa ON ac.assignment_id = aa.assignmentID
  LEFT JOIN assets a ON aa.asset_id = a.assetID AND a.deleted_at IS NULL
  WHERE ac.employee_signed_at IS NOT NULL
    AND ac.dept_head_signed_at IS NULL
    AND emp.department_id <=> ?
    AND emp.company_id = ?
  ORDER BY ac.created_at DESC
`;

export async function findPendingDeptHeadApprovalChecklists(
  approverDepartmentId: string,
  companyId: string
) {
  if (!(await hasDeptHeadSignColumns()) || !(await hasEmployeeSignColumns())) {
    return [];
  }
  try {
    const [rows] = await pool.query(PENDING_DEPT_HEAD_CHECKLIST_SQL, [
      approverDepartmentId,
      companyId,
    ]);
    return (rows as any[]).map(mapChecklistRow);
  } catch (error) {
    logger.error('Failed to find pending dept head approval checklists:', error);
    throw error;
  }
}

export async function findChecklistsApprovedByDeptHead(
  companyId: string,
  approverUserId: string
) {
  if (!(await hasDeptHeadSignColumns())) {
    return [];
  }
  const flags = await checklistSelectFlags();
  const query = `
    ${buildChecklistSelect(flags)}
    INNER JOIN users emp ON ac.employee_id = emp.userID
    WHERE ac.dept_head_signed_by = ?
      AND ac.dept_head_signed_at IS NOT NULL
      AND emp.company_id = ?
    ORDER BY ac.dept_head_signed_at DESC
  `;
  try {
    const [rows] = await pool.query(query, [approverUserId, companyId]);
    return (rows as any[]).map(mapChecklistRow);
  } catch (error) {
    logger.error('Failed to find checklists approved by dept head:', error);
    throw error;
  }
}

export async function approveChecklistsAsDeptHead(params: {
  checklistIds: string[];
  approverUserId: string;
  approverDepartmentId: string;
  companyId: string;
  digitalSignature: string | null;
}): Promise<number> {
  if (!(await hasDeptHeadSignColumns())) {
    const err = new Error(
      'dept_head_signed_at column missing — run db/migration_add_asset_checklist_dept_head_sign.sql'
    );
    (err as Error & { code?: string }).code = 'SCHEMA_MISSING_DEPT_HEAD_SIGN';
    throw err;
  }

  const {
    checklistIds,
    approverUserId,
    approverDepartmentId,
    companyId,
    digitalSignature,
  } = params;
  const ids = [...new Set(checklistIds.filter(id => id?.trim()))];
  if (ids.length === 0) {
    return 0;
  }

  const placeholders = ids.map(() => '?').join(',');
  const query = `
    UPDATE asset_checklists ac
    INNER JOIN users emp ON ac.employee_id = emp.userID
    SET ac.dept_head_signed_at = NOW(),
        ac.dept_head_signed_by = ?,
        ac.dept_head_digital_signature = ?
    WHERE ac.id IN (${placeholders})
      AND ac.employee_signed_at IS NOT NULL
      AND ac.dept_head_signed_at IS NULL
      AND emp.department_id <=> ?
      AND emp.company_id = ?
  `;

  try {
    const [result] = await pool.query(query, [
      approverUserId,
      digitalSignature,
      ...ids,
      approverDepartmentId,
      companyId,
    ]);
    return (result as { affectedRows?: number }).affectedRows ?? 0;
  } catch (error) {
    logger.error('Failed to approve checklists as dept head:', error);
    throw error;
  }
}
