import { pool } from '../db.js';
import logger from '../logger.js';
import { hasEmployeeSignColumns } from './assetChecklist.repository.js';

export async function getAssetChecklists() {
  const includeEmployeeSign = await hasEmployeeSignColumns();
  const employeeSignFields = includeEmployeeSign
    ? `ac.employee_signed_at,
      ac.employee_digital_signature,`
    : `NULL AS employee_signed_at,
      NULL AS employee_digital_signature,`;

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
      ${employeeSignFields}
      u.name AS creator_name,
      u.digital_signature AS creator_digital_signature,
      aa.asset_id,
      a.asset_code,
      a.name AS asset_name,
      c.logo_url AS employee_company_logo_url
    FROM asset_checklists ac
    LEFT JOIN asset_assignments aa ON ac.assignment_id = aa.assignmentID
    LEFT JOIN assets a ON aa.asset_id = a.assetID
    LEFT JOIN users u ON ac.created_by = u.userID
    LEFT JOIN companies c ON ac.employee_company = c.name AND c.deleted_at IS NULL
    ORDER BY ac.created_at DESC
  `;

  try {
    const [rows] = await pool.query(query);
    return (rows as any[]).map(checklist => ({
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
    }));
  } catch (error) {
    logger.error('Failed to get asset checklists:', error);
    throw error;
  }
}
