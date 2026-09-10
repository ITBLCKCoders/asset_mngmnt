import { pool } from '../db.js';
import type { PoolConnection } from 'mysql2/promise';
import crypto from 'crypto';

export interface AssetReturnForm {
  formID: string;
  form_number: string;
  user_id: string;
  department_id: string | null;
  location_id: string | null;
  location_room_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  signed_at?: string | null;
  signed_by?: string | null;
  signed_digital_signature?: string | null;
  process_signed_at?: string | null;
  process_digital_signature?: string | null;
  process_signed_by?: string | null;
  return_type?: string | null;
  received_by?: string | null;
  dept_head_signed_at?: string | null;
  dept_head_digital_signature?: string | null;
  dept_head_signed_by?: string | null;
  it_manager_signed_at?: string | null;
  it_manager_digital_signature?: string | null;
  it_manager_signed_by?: string | null;
  sub_approver_1_signed_at?: string | null;
  sub_approver_1_digital_signature?: string | null;
  sub_approver_1_signed_by?: string | null;
  sub_approver_2_signed_at?: string | null;
  sub_approver_2_digital_signature?: string | null;
  sub_approver_2_signed_by?: string | null;
  declined_at?: string | null;
  declined_by?: string | null;
  processor_declined_at?: string | null;
  processor_declined_by?: string | null;
  processor_decline_reason?: string | null;
  process_user_position?: string | null;
  /** When 1, returner does not sign digitally; form goes to asset owner's dept head for approval first */
  owner_absent?: number | boolean | null;
}

export class AssetReturnFormModel {
  static async create(
    formData: Omit<
      AssetReturnForm,
      'formID' | 'created_at' | 'updated_at' | 'deleted_at'
    >
  ): Promise<AssetReturnForm | null> {
    try {
      const formID = crypto.randomUUID();
      const ownerAbsent =
        formData.owner_absent === true || formData.owner_absent === 1 ? 1 : 0;
      await pool.execute(
        `INSERT INTO asset_return_forms
         (formID, form_number, user_id, department_id, location_id, location_room_id, created_by, process_signed_at, process_digital_signature, process_signed_by, return_type, received_by, process_user_position, owner_absent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          formID,
          formData.form_number,
          formData.user_id,
          formData.department_id ?? null,
          formData.location_id ?? null,
          formData.location_room_id ?? null,
          formData.created_by ?? null,
          formData.process_signed_at ?? null,
          formData.process_digital_signature ?? null,
          formData.process_signed_by ?? null,
          formData.return_type ?? null,
          formData.received_by ?? null,
          formData.process_user_position ?? null,
          ownerAbsent,
        ]
      );
      return this.findById(formID);
    } catch (error) {
      console.error('Error creating asset return form:', error);
      throw error;
    }
  }

  /** Create form with returner signature only (for submit-request flow). No process/dept_head/it_manager. */
  static async createWithReturnerSignature(
    formData: Omit<
      AssetReturnForm,
      'formID' | 'created_at' | 'updated_at' | 'deleted_at'
    > & {
      signed_by: string;
      signed_digital_signature: string | null;
    },
    connection?: PoolConnection
  ): Promise<AssetReturnForm | null> {
    try {
      const formID = crypto.randomUUID();
      const executor = connection ?? pool;
      await executor.execute(
        `INSERT INTO asset_return_forms
         (formID, form_number, user_id, department_id, location_id, location_room_id, created_by, signed_at, signed_by, signed_digital_signature, return_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
        [
          formID,
          formData.form_number,
          formData.user_id,
          formData.department_id ?? null,
          formData.location_id ?? null,
          formData.location_room_id ?? null,
          formData.created_by ?? null,
          formData.signed_by,
          formData.signed_digital_signature ?? null,
          formData.return_type ?? null,
        ]
      );
      return this.findById(formID, connection);
    } catch (error) {
      console.error(
        'Error creating asset return form with returner signature:',
        error
      );
      throw error;
    }
  }

  static async findById(
    formID: string,
    connection?: PoolConnection
  ): Promise<AssetReturnForm | null> {
    try {
      const executor = connection ?? pool;
      const [rows] = await executor.execute(
        `SELECT formID, form_number, user_id, department_id, location_id, location_room_id, created_by, created_at, updated_at, deleted_at,
         signed_at, signed_by, signed_digital_signature,
         DATE_FORMAT(process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
         process_digital_signature, process_signed_by,
         return_type, received_by,
         DATE_FORMAT(dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
         dept_head_digital_signature, dept_head_signed_by,
         DATE_FORMAT(it_manager_signed_at, '%Y-%m-%d %H:%i:%s') AS it_manager_signed_at,
         it_manager_digital_signature, it_manager_signed_by,
         DATE_FORMAT(sub_approver_1_signed_at, '%Y-%m-%d %H:%i:%s') AS sub_approver_1_signed_at,
         sub_approver_1_digital_signature, sub_approver_1_signed_by,
         DATE_FORMAT(sub_approver_2_signed_at, '%Y-%m-%d %H:%i:%s') AS sub_approver_2_signed_at,
         sub_approver_2_digital_signature, sub_approver_2_signed_by,
         declined_at, declined_by,
         DATE_FORMAT(processor_declined_at, '%Y-%m-%d %H:%i:%s') AS processor_declined_at,
         processor_declined_by, processor_decline_reason, process_user_position, owner_absent
         FROM asset_return_forms WHERE formID = ? AND deleted_at IS NULL`,
        [formID]
      );
      const forms = rows as AssetReturnForm[];
      return forms[0] ?? null;
    } catch (error) {
      console.error('Error finding asset return form by ID:', error);
      throw error;
    }
  }

  static async findAll(): Promise<AssetReturnForm[]> {
    try {
      const [rows] = await pool.execute(
        `SELECT formID, form_number, user_id, department_id, location_id, location_room_id, created_by, created_at, updated_at, deleted_at,
         signed_at, signed_by, signed_digital_signature,
         DATE_FORMAT(process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
         process_digital_signature, process_signed_by,
         return_type, received_by,
         DATE_FORMAT(dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
         dept_head_digital_signature, dept_head_signed_by,
         DATE_FORMAT(it_manager_signed_at, '%Y-%m-%d %H:%i:%s') AS it_manager_signed_at,
         it_manager_digital_signature, it_manager_signed_by,
         DATE_FORMAT(sub_approver_1_signed_at, '%Y-%m-%d %H:%i:%s') AS sub_approver_1_signed_at,
         sub_approver_1_digital_signature, sub_approver_1_signed_by,
         DATE_FORMAT(sub_approver_2_signed_at, '%Y-%m-%d %H:%i:%s') AS sub_approver_2_signed_at,
         sub_approver_2_digital_signature, sub_approver_2_signed_by,
         declined_at, declined_by, owner_absent
         FROM asset_return_forms WHERE deleted_at IS NULL AND (declined_at IS NULL) ORDER BY created_at DESC`
      );
      return rows as AssetReturnForm[];
    } catch (error) {
      console.error('Error finding all asset return forms:', error);
      throw error;
    }
  }

  static async findByUserId(userId: string): Promise<AssetReturnForm[]> {
    try {
      const [rows] = await pool.execute(
        `SELECT formID, form_number, user_id, department_id, location_id, location_room_id, created_by, created_at, updated_at, deleted_at,
         signed_at, signed_by, signed_digital_signature,
         DATE_FORMAT(process_signed_at, '%Y-%m-%d %H:%i:%s') AS process_signed_at,
         process_digital_signature, process_signed_by,
         return_type, received_by,
         DATE_FORMAT(dept_head_signed_at, '%Y-%m-%d %H:%i:%s') AS dept_head_signed_at,
         dept_head_digital_signature, dept_head_signed_by,
         DATE_FORMAT(it_manager_signed_at, '%Y-%m-%d %H:%i:%s') AS it_manager_signed_at,
         it_manager_digital_signature, it_manager_signed_by,
         DATE_FORMAT(sub_approver_1_signed_at, '%Y-%m-%d %H:%i:%s') AS sub_approver_1_signed_at,
         sub_approver_1_digital_signature, sub_approver_1_signed_by,
         DATE_FORMAT(sub_approver_2_signed_at, '%Y-%m-%d %H:%i:%s') AS sub_approver_2_signed_at,
         sub_approver_2_digital_signature, sub_approver_2_signed_by,
         declined_at, declined_by, owner_absent
         FROM asset_return_forms WHERE user_id = ? AND deleted_at IS NULL AND (declined_at IS NULL) ORDER BY created_at DESC`,
        [userId]
      );
      return rows as AssetReturnForm[];
    } catch (error) {
      console.error('Error finding asset return forms by user ID:', error);
      throw error;
    }
  }
}
