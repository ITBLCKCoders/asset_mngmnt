import { randomUUID } from 'crypto';
import type { Pool } from 'mysql2/promise';
import { getScopedActiveCompany } from '../utils/activeCompany.js';
import type { AssetBorrowRequestRow } from '../repositories/assetBorrowRequests.repository.js';
import {
  classifyDepartmentScopeByName,
  getAssetScope,
  getBorrowRequestListScope,
  getDepartmentIdsForScope,
} from '../utils/assetScope.js';
import {
  isDesignatedApprover,
  isDesignatedSubApprover,
  getDesignatedApproverUserId,
  getDesignatedSubApproverUserId,
  getRequestorMA1Status,
} from '../utils/approverNotifications.js';
import { generateBorrowFormNumber } from '../utils/borrowFormNumber.js';
import {
  findApprovedBorrowRequestsForReceive,
  findBorrowRequestsApprovedByDeptHeadMe,
  findBorrowRequestsReceivedByMe,
  findAvailableAssetsForBorrowStaffPool,
  findBorrowRequestsForList,
  findBorrowRequestsForUser,
  findPendingDeptHeadBorrowRequests,
  findPendingDeptHeadBorrowRequestsByCompany,
  getAssignmentForBorrowRequest,
  getAvailableAssetByCodeForBorrowStaffPool,
  getBorrowRequestById,
  getCategoryDepartmentForCompany,
  getTypeForCategoryAndCompany,
  insertAssetBorrowRequest,
  updateAssignmentStatusActive,
  updateBorrowRequestDeptHeadApprove,
  updateBorrowRequestDeptHeadDecline,
  updateBorrowRequestReceived,
  updateBorrowRequestStaffApprove,
  updateBorrowRequestStaffDecline,
  updateBorrowRequestReturnProcess,
} from '../repositories/assetBorrowRequests.repository.js';
import type { CreateAssetBorrowRequestDto } from '../dtos/assetBorrowRequests/CreateAssetBorrowRequestDto.js';
import type { DeptHeadApproveBorrowRequestDto } from '../dtos/assetBorrowRequests/DeptHeadApproveBorrowRequestDto.js';
import logger from '../logger.js';

function parseExpectedReturnAt(input: string): string | null {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export class AssetBorrowRequestsService {
  private static dueReminderCache = new Set<string>();
  /** When false, reminder SQL failed (usually missing migration); skip until process restart. */
  private static borrowDueRemindersSchemaOk: boolean | null = null;
  static async create(
    pool: Pool,
    userId: string,
    body: CreateAssetBorrowRequestDto
  ): Promise<{ id: string } | { error: string; status: number }> {
    const company = await getScopedActiveCompany(pool, userId);
    if (!company?.id) {
      return { error: 'No active company found', status: 400 };
    }

    const expectedMysql = parseExpectedReturnAt(body.expected_return_at);
    if (!expectedMysql) {
      return { error: 'Invalid expected return date', status: 400 };
    }

    const cat = await getCategoryDepartmentForCompany(
      pool,
      body.category_id,
      company.id
    );
    if (!cat) {
      return { error: 'Category not found', status: 400 };
    }

    const deptScope = classifyDepartmentScopeByName(cat.departmentName);
    if (body.borrow_scope === 'it' && deptScope !== 'IT') {
      return {
        error: 'Selected category is not an IT asset category',
        status: 400,
      };
    }
    if (body.borrow_scope === 'admin' && deptScope !== 'Admin') {
      return {
        error: 'Selected category is not an Admin asset category',
        status: 400,
      };
    }

    const typeOk = await getTypeForCategoryAndCompany(
      pool,
      body.type_id,
      body.category_id,
      company.id
    );
    if (!typeOk) {
      return { error: 'Type does not match category or company', status: 400 };
    }

    const id = randomUUID();
    const formNumber = await generateBorrowFormNumber(company.id, cat.departmentId);
    await insertAssetBorrowRequest(pool, {
      id,
      companyId: company.id,
      userId,
      borrowScope: body.borrow_scope,
      categoryId: body.category_id,
      typeId: body.type_id,
      formNumber,
      expectedReturnAt: expectedMysql,
      purpose: body.purpose.trim(),
      requestedBySignature: body.requested_by_signature ?? null,
    });

    return { id };
  }

  static async listForStaff(
    pool: Pool,
    userId: string,
    companyIdParam?: string
  ): Promise<
    | { rows: Awaited<ReturnType<typeof findBorrowRequestsForList>> }
    | { error: string; status: number }
  > {
    // Use provided companyId if given, otherwise resolve from scope
    let companyId: string | null;
    let borrowScope: 'it' | 'admin' | null = null;

    if (companyIdParam) {
      companyId = companyIdParam;
    } else {
      const scope = await getBorrowRequestListScope(pool, userId);
      companyId = scope.companyId;
      borrowScope = scope.borrowScope;
    }

    if (!companyId) {
      return { rows: [] };
    }

    const rows = await findBorrowRequestsForList(
      pool,
      companyId,
      borrowScope
    );
    return { rows };
  }

  static async listForCurrentUser(
    pool: Pool,
    userId: string
  ): Promise<
    | { rows: Awaited<ReturnType<typeof findBorrowRequestsForUser>> }
    | { error: string; status: number }
  > {
    const company = await getScopedActiveCompany(pool, userId);
    if (!company?.id) {
      return { error: 'No active company found', status: 400 };
    }

    const rows = await findBorrowRequestsForUser(pool, company.id, userId);
    return { rows };
  }

  static async listPendingDeptHeadApprovals(
    pool: Pool,
    userId: string
  ): Promise<
    | { rows: Awaited<ReturnType<typeof findPendingDeptHeadBorrowRequests>> }
    | { error: string; status: number }
  > {
    const { companyId } = await getAssetScope(pool, userId);
    if (!companyId) {
      return { rows: [] };
    }

    // Check if user is designated approver or sub approver for this company
    const isApprover = await isDesignatedApprover(userId, companyId);
    const isSubApprover = await isDesignatedSubApprover(userId, companyId);
    if (!isApprover && !isSubApprover) {
      return { rows: [] };
    }

    // Designated approvers see all pending requests in the company (company-wide)
    const rows = await findPendingDeptHeadBorrowRequestsByCompany(
      pool,
      companyId
    );
    return { rows };
  }

  static async listApprovedByDeptHeadMe(
    pool: Pool,
    userId: string
  ): Promise<
    | { rows: Awaited<ReturnType<typeof findBorrowRequestsApprovedByDeptHeadMe>> }
    | { error: string; status: number }
  > {
    const { companyId } = await getAssetScope(pool, userId);
    if (!companyId) {
      return { rows: [] };
    }

    const rows = await findBorrowRequestsApprovedByDeptHeadMe(
      pool,
      companyId,
      userId
    );
    return { rows };
  }

  static async approveDeptHead(
    pool: Pool,
    userId: string,
    borrowRequestId: string,
    body: DeptHeadApproveBorrowRequestDto
  ): Promise<{ ok: true } | { error: string; status: number }> {
    const { companyId } = await getAssetScope(pool, userId);
    if (!companyId) {
      return { error: 'Company context required', status: 400 };
    }

    // Check if user is designated approver or sub approver for this company
    const isApprover = await isDesignatedApprover(userId, companyId);
    const isSubApprover = await isDesignatedSubApprover(userId, companyId);
    if (!isApprover && !isSubApprover) {
      return { error: 'Not authorized as department head approver', status: 403 };
    }

    const row = await getBorrowRequestById(pool, borrowRequestId);
    if (!row) {
      return { error: 'Borrow request not found', status: 404 };
    }
    if (row.company_id !== companyId) {
      return { error: 'Borrow request not in your company', status: 403 };
    }
    if (row.dept_head_signed_at || row.sub_approver_1_signed_at || row.declined_at) {
      return { error: 'Borrow request is no longer pending approval', status: 400 };
    }

    const isSubApproverAction = isSubApprover && !isApprover;
    const updated = await updateBorrowRequestDeptHeadApprove(
      pool,
      borrowRequestId,
      userId,
      isSubApproverAction
    );
    if (!updated) {
      return { error: 'Could not approve borrow request', status: 409 };
    }

    return { ok: true };
  }

  static async declineDeptHead(
    pool: Pool,
    userId: string,
    borrowRequestId: string
  ): Promise<{ ok: true } | { error: string; status: number }> {
    const { companyId } = await getAssetScope(pool, userId);
    if (!companyId) {
      return { error: 'Company context required', status: 400 };
    }

    // Check if user is designated approver or sub approver for this company
    const isApprover = await isDesignatedApprover(userId, companyId);
    const isSubApprover = await isDesignatedSubApprover(userId, companyId);
    if (!isApprover && !isSubApprover) {
      return { error: 'Not authorized as department head approver', status: 403 };
    }

    const row = await getBorrowRequestById(pool, borrowRequestId);
    if (!row) {
      return { error: 'Borrow request not found', status: 404 };
    }
    if (row.company_id !== companyId) {
      return { error: 'Borrow request not in your company', status: 403 };
    }
    if (row.dept_head_signed_at || row.sub_approver_1_signed_at || row.declined_at) {
      return { error: 'Borrow request is no longer pending approval', status: 400 };
    }

    const updated = await updateBorrowRequestDeptHeadDecline(
      pool,
      borrowRequestId
    );
    if (!updated) {
      return { error: 'Could not decline borrow request', status: 409 };
    }
    return { ok: true };
  }

  static async listAvailableAssetsForStaffProcessing(
    pool: Pool,
    userId: string,
    borrowRequestId: string
  ): Promise<
    | { assets: Awaited<ReturnType<typeof findAvailableAssetsForBorrowStaffPool>> }
    | { error: string; status: number }
  > {
    const row = await getBorrowRequestById(pool, borrowRequestId);
    if (!row) return { error: 'Borrow request not found', status: 404 };
    const { companyId, borrowScope } = await getBorrowRequestListScope(
      pool,
      userId
    );
    if (!companyId) return { error: 'Company context required', status: 400 };
    if (row.company_id !== companyId) {
      return { error: 'Borrow request not in your company', status: 403 };
    }
    if (borrowScope !== null && borrowScope !== row.borrow_scope) {
      return { error: 'Not authorized for this scope', status: 403 };
    }
    if (
      row.declined_at ||
      row.processor_declined_at ||
      row.status === 'declined' ||
      row.returned_at ||
      row.status === 'returned' ||
      row.approved_at
    ) {
      return { error: 'This borrow request is not open for asset selection', status: 400 };
    }
    if (!row.dept_head_signed_at && !row.sub_approver_1_signed_at) {
      return {
        error: 'This borrow request still requires department head approval',
        status: 400,
      };
    }
    const departmentIds = await getDepartmentIdsForScope(
      pool,
      row.borrow_scope,
      companyId
    );
    const assets = await findAvailableAssetsForBorrowStaffPool(pool, {
      companyId,
      departmentIds,
      preferredCategoryId: row.category_id,
      preferredTypeId: row.type_id,
    });
    return { assets };
  }

  static async staffApprove(
    pool: Pool,
    userId: string,
    params: {
      borrowRequestId: string;
      assetCode: string;
      preUsageCondition: string;
      processorRemarks?: string;
      conditionImages?: string[];
      processorSignature?: string;
      processorSignedAt?: string;
    }
  ): Promise<{ ok: true } | { error: string; status: number }> {
    const row = await getBorrowRequestById(pool, params.borrowRequestId);
    if (!row) return { error: 'Borrow request not found', status: 404 };
    const { companyId, borrowScope } = await getBorrowRequestListScope(
      pool,
      userId
    );
    if (!companyId) return { error: 'Company context required', status: 400 };
    if (row.company_id !== companyId) {
      return { error: 'Borrow request not in your company', status: 403 };
    }
    if (borrowScope !== null && borrowScope !== row.borrow_scope) {
      return { error: 'Not authorized for this scope', status: 403 };
    }
    if (row.declined_at) {
      return { error: 'Borrow request was declined', status: 400 };
    }
    if (row.processor_declined_at || row.status === 'declined') {
      return { error: 'Borrow request is not open for processing', status: 400 };
    }
    if (row.approved_at) {
      return { error: 'Borrow request is already processed', status: 400 };
    }
    if (!row.dept_head_signed_at && !row.sub_approver_1_signed_at) {
      return {
        error: 'Borrow request still requires department head approval',
        status: 400,
      };
    }

    const departmentIds = await getDepartmentIdsForScope(
      pool,
      row.borrow_scope,
      companyId
    );
    const asset = await getAvailableAssetByCodeForBorrowStaffPool(pool, {
      companyId,
      departmentIds,
      assetCode: params.assetCode,
    });
    if (!asset) {
      return { error: 'Selected asset is not available for this request', status: 400 };
    }

    // Create assignment for borrower (same stored proc used by asset assignment flow)
    const assignmentId = randomUUID();
    await pool.execute('CALL sp_create_assignment(?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      assignmentId,
      asset.assetID,
      row.user_id,
      row.requester_department_id ?? null,
      null,
      null,
      row.expected_return_at ?? null,
      `Borrow request ${row.form_number ?? row.borrow_request_id}: ${row.purpose}`.slice(0, 255),
      userId,
    ]);

    // Set assignment status to 'Inactive' - asset will appear in My Assets only after receive approval
    await pool.execute(
      `UPDATE asset_assignments SET status = 'Inactive' WHERE assignmentID = ?`,
      [assignmentId]
    );

    const updated = await updateBorrowRequestStaffApprove(pool, {
      borrowRequestId: params.borrowRequestId,
      approvedBy: userId,
      assetId: asset.assetID,
      preUsageCondition: params.preUsageCondition,
      processorRemarks: params.processorRemarks ?? null,
      preUsageConditionImages: params.conditionImages ?? null,
      processorSignature: params.processorSignature ?? null,
      processorSignedAt: params.processorSignedAt ?? null,
    });
    if (!updated) {
      return { error: 'Could not process borrow request', status: 409 };
    }

    return { ok: true };
  }

  static async staffDecline(
    pool: Pool,
    userId: string,
    params: { borrowRequestId: string; reason: string }
  ): Promise<{ ok: true } | { error: string; status: number }> {
    const row = await getBorrowRequestById(pool, params.borrowRequestId);
    if (!row) return { error: 'Borrow request not found', status: 404 };
    const { companyId, borrowScope } = await getBorrowRequestListScope(pool, userId);
    if (!companyId) return { error: 'Company context required', status: 400 };
    if (row.company_id !== companyId) return { error: 'Not in your company', status: 403 };
    if (borrowScope !== null && borrowScope !== row.borrow_scope) {
      return { error: 'Not authorized for this scope', status: 403 };
    }
    if (row.processor_declined_at || row.declined_at || row.status === 'declined') {
      return { error: 'Borrow request is already closed', status: 400 };
    }
    if (!row.dept_head_signed_at && !row.sub_approver_1_signed_at) {
      return {
        error: 'Borrow request still requires department head approval',
        status: 400,
      };
    }
    const updated = await updateBorrowRequestStaffDecline(pool, {
      borrowRequestId: params.borrowRequestId,
      reason: params.reason,
    });
    if (!updated) return { error: 'Could not decline borrow request', status: 409 };
    // Intentionally no in-app / socket notification to the borrower on processor decline.
    return { ok: true };
  }

  static async getApprovedBorrowRequestsForReceive(
    pool: Pool,
    userId: string
  ): Promise<{ borrowRequests: AssetBorrowRequestRow[] } | { error: string; status: number }> {
    const { companyId, borrowScope } = await getBorrowRequestListScope(pool, userId);
    if (!companyId) return { error: 'Company context required', status: 400 };

    const borrowRequests = await findApprovedBorrowRequestsForReceive(pool, companyId, borrowScope);
    return { borrowRequests };
  }

  static async listReceivedByMe(
    pool: Pool,
    userId: string
  ): Promise<{ borrowRequests: AssetBorrowRequestRow[] } | { error: string; status: number }> {
    const borrowRequests = await findBorrowRequestsReceivedByMe(pool, userId);
    return { borrowRequests };
  }

  static async receiveBorrowRequest(
    pool: Pool,
    userId: string,
    borrowRequestId: string,
    digitalSignature?: string | null
  ): Promise<{ ok: true } | { error: string; status: number }> {
    const row = await getBorrowRequestById(pool, borrowRequestId);
    if (!row) return { error: 'Borrow request not found', status: 404 };

    const { companyId, borrowScope } = await getBorrowRequestListScope(pool, userId);
    if (!companyId) return { error: 'Company context required', status: 400 };
    if (row.company_id !== companyId) return { error: 'Not in your company', status: 403 };
    if (borrowScope !== null && borrowScope !== row.borrow_scope) {
      return { error: 'Not authorized for this scope', status: 403 };
    }

    if (!row.approved_at) return { error: 'Borrow request is not processed yet', status: 400 };
    if (row.returned_at) return { error: 'Borrow request is already returned', status: 400 };
    if (row.received_at) return { error: 'Borrow request is already received', status: 400 };

    // Activate the assignment so asset appears in user's My Assets
    if (row.asset_id && row.user_id) {
      const assignment = await getAssignmentForBorrowRequest(pool, row.asset_id, row.user_id);
      if (assignment) {
        await updateAssignmentStatusActive(pool, assignment.assignmentID);
      }
    }

    const updated = await updateBorrowRequestReceived(pool, borrowRequestId, userId, digitalSignature);
    if (!updated) return { error: 'Could not receive borrow request', status: 409 };

    return { ok: true };
  }

  static async processBorrowReturn(
    pool: Pool,
    userId: string,
    params: {
      borrowRequestId: string;
      returnCondition: string;
      returnRemarks?: string;
      returnConditionImages: string[];
    }
  ): Promise<{ ok: true } | { error: string; status: number }> {
    const row = await getBorrowRequestById(pool, params.borrowRequestId);
    if (!row) return { error: 'Borrow request not found', status: 404 };
    const { companyId, borrowScope } = await getBorrowRequestListScope(pool, userId);
    if (!companyId) return { error: 'Company context required', status: 400 };
    if (row.company_id !== companyId) return { error: 'Not in your company', status: 403 };
    if (borrowScope !== null && borrowScope !== row.borrow_scope) {
      return { error: 'Not authorized for this scope', status: 403 };
    }
    if (!row.approved_at) return { error: 'Borrow request is not processed yet', status: 400 };

    if (row.asset_id) {
      const [assignRows] = (await pool.execute(
        `SELECT assignmentID FROM asset_assignments
         WHERE asset_id = ? AND user_id = ? AND status = 'Assigned' AND deleted_at IS NULL
         ORDER BY assigned_date DESC LIMIT 1`,
        [row.asset_id, row.user_id]
      )) as [{ assignmentID: string }[], unknown];
      const assignmentId = assignRows?.[0]?.assignmentID;
      if (assignmentId) {
        await pool.execute('CALL sp_return_assignment(?, ?, ?, ?)', [
          assignmentId,
          params.returnRemarks || '',
          null,
          userId,
        ]);
      }
    }

    const updated = await updateBorrowRequestReturnProcess(pool, {
      borrowRequestId: params.borrowRequestId,
      returnCondition: params.returnCondition,
      returnRemarks: params.returnRemarks ?? null,
      returnConditionImages: params.returnConditionImages,
    });
    if (!updated) return { error: 'Could not process borrow return', status: 409 };

    return { ok: true };
  }

  static async processDueReminders(pool: Pool): Promise<void> {
    if (this.borrowDueRemindersSchemaOk === false) return;
    try {
      const [rows] = (await pool.execute(
        `SELECT borrow_request_id, user_id, approved_by, form_number, expected_return_at,
                due_5m_notified_at, due_notified_at
         FROM asset_borrow_requests
         WHERE approved_at IS NOT NULL
           AND returned_at IS NULL
           AND declined_at IS NULL
           AND processor_declined_at IS NULL`
      )) as [
        {
          borrow_request_id: string;
          user_id: string;
          approved_by: string | null;
          form_number: string | null;
          expected_return_at: string;
          due_5m_notified_at: string | null;
          due_notified_at: string | null;
        }[],
        unknown,
      ];
      this.borrowDueRemindersSchemaOk = true;
      const now = Date.now();
      for (const row of rows ?? []) {
        const dueAt = new Date(row.expected_return_at).getTime();
        if (!Number.isFinite(dueAt)) continue;
        if (dueAt - now <= 5 * 60 * 1000 && dueAt - now > 0 && !row.due_5m_notified_at) {
          const key = `${row.borrow_request_id}:minus5`;
          if (!this.dueReminderCache.has(key)) {
            this.dueReminderCache.add(key);
            await pool.execute(
              'UPDATE asset_borrow_requests SET due_5m_notified_at = NOW() WHERE borrow_request_id = ?',
              [row.borrow_request_id]
            );
          }
        }

        if (now >= dueAt && !row.due_notified_at) {
          const key = `${row.borrow_request_id}:due`;
          if (!this.dueReminderCache.has(key)) {
            this.dueReminderCache.add(key);
            await pool.execute(
              'UPDATE asset_borrow_requests SET due_notified_at = NOW() WHERE borrow_request_id = ?',
              [row.borrow_request_id]
            );
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const code = (err as { code?: string }).code;
      const isMissingColumn =
        code === 'ER_BAD_FIELD_ERROR' || msg.includes('Unknown column');
      if (isMissingColumn) {
        if (this.borrowDueRemindersSchemaOk as boolean | null !== false) {
          logger.warn(
            '[borrow reminders] Disabled until DB migration: run db/migration_asset_borrow_workflow_upgrade.sql',
            { message: msg }
          );
        }
        this.borrowDueRemindersSchemaOk = false;
        return;
      }
      logger.error('[borrow reminders] processDueReminders failed', {
        message: err instanceof Error ? err.message : String(err),
        code: (err as { code?: string })?.code,
        errno: (err as { errno?: number })?.errno,
        sqlState: (err as { sqlState?: string })?.sqlState,
        sqlMessage: (err as { sqlMessage?: string })?.sqlMessage,
        sql: (err as { sql?: string })?.sql,
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
  }
}
