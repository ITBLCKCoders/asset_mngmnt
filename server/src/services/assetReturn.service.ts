import {
  getCategoryDepartmentForAssetIds,
  resolveReturnFormCompanyId,
} from '../repositories/assetReturn.repository.js';
import {
  generateReturnFormNumber,
  generateReturnFormNumberFallback,
} from '../utils/returnFormNumber.js';

/**
 * Asset return service — orchestration layer between controllers and the
 * repository / model layers. Handlers should call into this service rather
 * than re-implementing form-context resolution inline.
 */

/**
 * Result of resolving the metadata needed to create a return form: the
 * effective department (asset-category > assignment), the company, and the
 * generated form number.
 */
export interface ReturnFormContext {
  /** departmentID used as the form's department_id (asset-category preferred). */
  categoryDeptId: string | null;
  /** companyID associated with the form (department > user fallback). */
  companyId: string | null;
  /** Pre-generated form number (uses settings if available, else fallback). */
  formNumber: string;
}

/**
 * Resolve form context for a new return form.
 *
 * Mirrors the behaviour previously inlined in submitAssetReturnRequestHandler
 * and createAssetReturnHandler:
 *   1. Pick the asset-category department of the first asset whose category
 *      maps to a department.
 *   2. Determine company_id from that department, falling back to the user's
 *      company_id.
 *   3. Generate a form number (settings-based if companyId is known, else
 *      RET-YYYYMMDD-XXXX fallback).
 */
export async function resolveReturnFormContext(args: {
  assetIds: string[];
  fallbackDepartmentId: string | null | undefined;
  fallbackUserId: string | null | undefined;
}): Promise<ReturnFormContext> {
  const categoryDeptId = await getCategoryDepartmentForAssetIds(args.assetIds);
  const deptIdForCompany = categoryDeptId || args.fallbackDepartmentId || null;
  const companyId = await resolveReturnFormCompanyId(
    deptIdForCompany,
    args.fallbackUserId ?? null
  );
  const formNumber =
    companyId != null
      ? await generateReturnFormNumber(companyId, categoryDeptId)
      : await generateReturnFormNumberFallback();
  return { categoryDeptId, companyId, formNumber };
}

// Re-export commonly used repository helpers so handlers only import the
// service module — keeps the dependency graph narrow.
export {
  fetchAssetReturnFormsRowsForUserList,
  fetchPendingDeptHeadApprovalFormRows,
  fetchUserPosition,
  resolveProcessorReturnTarget,
  isMysqlUnknownColumnError,
  getActiveAssignmentsByIds,
} from '../repositories/assetReturn.repository.js';
