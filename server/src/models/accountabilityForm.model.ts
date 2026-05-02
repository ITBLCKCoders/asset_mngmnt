import { pool } from '../db.js';

export interface AccountabilityForm {
  accountabilityFormID: string;
  asset_id: string;
  user_id: string;
  assigned_date: string;
  due_date: string;
  returned_date: string | null;
  status: 'active' | 'returned' | 'overdue';
  notes: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  deleted_at: string | null;
}

export class AccountabilityFormModel {
  static async findAll(): Promise<AccountabilityForm[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_accountability_forms WHERE deleted_at IS NULL'
      );
      return rows as AccountabilityForm[];
    } catch (error) {
      console.error('Error finding all accountability forms:', error);
      throw error;
    }
  }

  static async findById(
    accountabilityFormID: string
  ): Promise<AccountabilityForm | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_accountability_forms WHERE accountabilityFormID = ? AND deleted_at IS NULL',
        [accountabilityFormID]
      );
      const forms = rows as AccountabilityForm[];
      return forms[0] ?? null;
    } catch (error) {
      console.error('Error finding accountability form by ID:', error);
      throw error;
    }
  }

  static async findByAssetId(asset_id: string): Promise<AccountabilityForm[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_accountability_forms WHERE asset_id = ? AND deleted_at IS NULL',
        [asset_id]
      );
      return rows as AccountabilityForm[];
    } catch (error) {
      console.error('Error finding accountability forms by asset ID:', error);
      throw error;
    }
  }

  static async findByUserId(user_id: string): Promise<AccountabilityForm[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_accountability_forms WHERE user_id = ? AND deleted_at IS NULL',
        [user_id]
      );
      return rows as AccountabilityForm[];
    } catch (error) {
      console.error('Error finding accountability forms by user ID:', error);
      throw error;
    }
  }

  static async create(
    formData: Partial<AccountabilityForm>,
    userId: string
  ): Promise<AccountabilityForm | null> {
    try {
      const [result] = await pool.execute(
        'INSERT INTO asset_accountability_forms (asset_id, user_id, assigned_date, due_date, notes, created_by, updated_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          formData.asset_id,
          formData.user_id,
          formData.assigned_date,
          formData.due_date,
          formData.notes,
          userId,
          userId,
          'active',
        ]
      );
      return this.findById((result as any).insertId);
    } catch (error) {
      console.error('Error creating accountability form:', error);
      throw error;
    }
  }

  static async update(
    accountabilityFormID: string,
    formData: Partial<AccountabilityForm>,
    userId: string
  ): Promise<AccountabilityForm | null> {
    try {
      await pool.execute(
        'UPDATE asset_accountability_forms SET asset_id = ?, user_id = ?, assigned_date = ?, due_date = ?, returned_date = ?, status = ?, notes = ?, updated_by = ?, updated_at = NOW() WHERE accountabilityFormID = ? AND deleted_at IS NULL',
        [
          formData.asset_id,
          formData.user_id,
          formData.assigned_date,
          formData.due_date,
          formData.returned_date,
          formData.status,
          formData.notes,
          userId,
          accountabilityFormID,
        ]
      );
      return this.findById(accountabilityFormID);
    } catch (error) {
      console.error('Error updating accountability form:', error);
      throw error;
    }
  }

  static async delete(
    accountabilityFormID: string,
    userId: string
  ): Promise<void> {
    try {
      await pool.execute(
        'UPDATE asset_accountability_forms SET deleted_at = NOW(), updated_by = ? WHERE accountabilityFormID = ? AND deleted_at IS NULL',
        [userId, accountabilityFormID]
      );
    } catch (error) {
      console.error('Error deleting accountability form:', error);
      throw error;
    }
  }
}
