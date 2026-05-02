import { pool } from '../db.js';
import crypto from 'crypto';

export interface AssetTransferForm {
  formID: string;
  form_number: string;
  user_id: string;
  department_id: string | null;
  location_id: string | null;
  location_room_id: string | null;
  new_assigned_user_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  signed_at?: string | null;
  signed_by?: string | null;
  signed_digital_signature?: string | null;
  process_signed_at?: string | null;
  process_digital_signature?: string | null;
  transfer_type?: string | null;
  received_by?: string | null;
  dept_head_signed_at?: string | null;
  dept_head_digital_signature?: string | null;
  dept_head_signed_by?: string | null;
  it_manager_signed_at?: string | null;
  it_manager_digital_signature?: string | null;
  it_manager_signed_by?: string | null;
  executed_at?: string | null;
  return_form_id?: string | null;
  declined_at?: string | null;
  declined_by?: string | null;
}

export class AssetTransferFormModel {
  static async create(
    formData: Omit<
      AssetTransferForm,
      'formID' | 'created_at' | 'updated_at' | 'deleted_at'
    >
  ): Promise<AssetTransferForm | null> {
    const formID = crypto.randomUUID();
    const processSignedAtForDb =
      formData.process_signed_at != null ? formData.process_signed_at : null;

    await pool.execute(
      'CALL sp_create_asset_transfer_form(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        formID,
        formData.form_number,
        formData.user_id,
        formData.department_id ?? '',
        formData.location_id ?? '',
        formData.location_room_id ?? '',
        formData.new_assigned_user_id ?? '',
        formData.created_by ?? '',
        processSignedAtForDb,
        formData.process_digital_signature ?? null,
        formData.transfer_type ?? '',
        formData.received_by ?? '',
      ]
    );
    const row = await this.findById(formID);
    // Ensure formID is always present (MySQL may return form_id instead of formID)
    const resolvedFormID =
      (row as any)?.formID ?? (row as any)?.form_id ?? formID;
    return row
      ? { ...row, formID: resolvedFormID }
      : ({ formID, ...formData } as AssetTransferForm);
  }

  static async findById(formID: string): Promise<AssetTransferForm | null> {
    const [rowsResult] = (await pool.execute(
      'CALL sp_get_asset_transfer_form_by_id(?)',
      [formID]
    )) as any[];
    const rows = Array.isArray(rowsResult?.[0])
      ? rowsResult[0]
      : (rowsResult ?? []);
    return (Array.isArray(rows) ? rows : [])[0] ?? null;
  }

  static async findByUserId(userId: string): Promise<AssetTransferForm[]> {
    const [rowsResult] = (await pool.execute(
      'CALL sp_get_asset_transfer_forms_by_user(?)',
      [userId]
    )) as any[];
    const rows = Array.isArray(rowsResult?.[0])
      ? rowsResult[0]
      : (rowsResult ?? []);
    return (Array.isArray(rows) ? rows : []).map((r: any) => ({
      ...r,
      formID: r.formID ?? r.form_id ?? '',
    }));
  }

  static async findAll(): Promise<AssetTransferForm[]> {
    const [rows] = (await pool.execute(
      `SELECT formID, form_number, user_id, department_id, location_id, location_room_id,
              new_assigned_user_id, created_by, created_at, signed_at, signed_by, signed_digital_signature,
              DATE_FORMAT(process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
              process_digital_signature, transfer_type, received_by
       FROM asset_transfer_forms WHERE deleted_at IS NULL
       ORDER BY created_at DESC`
    )) as any[];
    const list = Array.isArray(rows) ? rows : [];
    return list.map((r: any) => ({
      ...r,
      formID: r.formID ?? r.form_id ?? '',
    }));
  }

  /** Create form with no signatures (for hold flow). Links to return form via return_form_id. */
  static async createPending(
    formData: Omit<
      AssetTransferForm,
      'formID' | 'created_at' | 'updated_at' | 'deleted_at'
    > & { return_form_id?: string | null }
  ): Promise<AssetTransferForm | null> {
    const formID = crypto.randomUUID();
    await pool.execute(
      `INSERT INTO asset_transfer_forms
       (formID, form_number, user_id, department_id, location_id, location_room_id,
        new_assigned_user_id, created_by, transfer_type, return_form_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        formID,
        formData.form_number,
        formData.user_id,
        formData.department_id ?? null,
        formData.location_id ?? null,
        formData.location_room_id ?? null,
        formData.new_assigned_user_id ?? null,
        formData.created_by ?? null,
        (formData as any).transfer_type ?? null,
        (formData as any).return_form_id ?? null,
      ]
    );
    const row = await this.findById(formID);
    const resolvedFormID =
      (row as any)?.formID ?? (row as any)?.form_id ?? formID;
    return row
      ? { ...row, formID: resolvedFormID }
      : ({ formID, ...formData } as AssetTransferForm);
  }

  /** Create form with transferer signature only (for submit-request flow). No process_* set. Optional return_form_id links to asset return form. */
  static async createWithTransfererSignature(
    formData: Omit<
      AssetTransferForm,
      'formID' | 'created_at' | 'updated_at' | 'deleted_at'
    > & {
      signed_by: string;
      signed_digital_signature: string | null;
      return_form_id?: string | null;
    }
  ): Promise<AssetTransferForm | null> {
    const formID = crypto.randomUUID();
    await pool.execute(
      `INSERT INTO asset_transfer_forms
       (formID, form_number, user_id, department_id, location_id, location_room_id,
        new_assigned_user_id, created_by, signed_at, signed_by, signed_digital_signature, transfer_type, return_form_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)`,
      [
        formID,
        formData.form_number,
        formData.user_id,
        formData.department_id ?? null,
        formData.location_id ?? null,
        formData.location_room_id ?? null,
        formData.new_assigned_user_id ?? null,
        formData.created_by ?? null,
        formData.signed_by,
        formData.signed_digital_signature ?? null,
        (formData as any).transfer_type ?? null,
        (formData as any).return_form_id ?? null,
      ]
    );
    const row = await this.findById(formID);
    const resolvedFormID =
      (row as any)?.formID ?? (row as any)?.form_id ?? formID;
    return row
      ? { ...row, formID: resolvedFormID }
      : ({ formID, ...formData } as AssetTransferForm);
  }

  /** Insert assignment IDs for a transfer form (submit-request flow). */
  static async addFormAssignments(
    formId: string,
    assignmentIds: string[]
  ): Promise<void> {
    for (const assignmentId of assignmentIds) {
      await pool.execute(
        'INSERT INTO transfer_form_assignments (form_id, assignment_id) VALUES (?, ?)',
        [formId, assignmentId]
      );
    }
  }

  /** Get assignment IDs linked to a transfer form. */
  static async getFormAssignmentIds(formId: string): Promise<string[]> {
    const [rows] = (await pool.execute(
      'SELECT assignment_id FROM transfer_form_assignments WHERE form_id = ?',
      [formId]
    )) as any[];
    const list = Array.isArray(rows) ? rows : [];
    return list.map((r: any) => r.assignment_id);
  }
}
