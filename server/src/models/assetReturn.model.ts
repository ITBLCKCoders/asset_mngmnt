import { pool } from '../db.js';
import type { PoolConnection } from 'mysql2/promise';
import crypto from 'crypto';

export interface AssetReturn {
  return_id: string;
  assignment_id: string;
  user_id: string;
  return_condition: string;
  return_notes: string;
  return_location_id?: string;
  return_location_room_id?: string;
  return_department_id?: string;
  return_batch_id?: string | null;
  form_id?: string | null;
  condition_images?: string[] | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export class AssetReturnModel {
  static async create(
    assetReturnData: Omit<
      AssetReturn,
      'return_id' | 'created_at' | 'updated_at' | 'deleted_at'
    >,
    connection?: PoolConnection
  ): Promise<AssetReturn | null> {
    try {
      const return_id = crypto.randomUUID();

      const conditionImagesJson =
        assetReturnData.condition_images &&
        assetReturnData.condition_images.length > 0
          ? JSON.stringify(assetReturnData.condition_images)
          : null;

      const executor = connection ?? pool;
      await executor.execute(
        'CALL sp_create_asset_return(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          return_id,
          assetReturnData.assignment_id,
          assetReturnData.user_id,
          assetReturnData.return_condition,
          assetReturnData.return_notes || '',
          assetReturnData.return_location_id ?? '',
          assetReturnData.return_location_room_id ?? '',
          assetReturnData.return_department_id ?? '',
          assetReturnData.return_batch_id ?? '',
          assetReturnData.form_id ?? '',
          conditionImagesJson,
        ]
      );

      return this.findById(return_id, connection);
    } catch (error) {
      console.error('Error creating asset return:', error);
      throw error;
    }
  }

  static async findById(
    return_id: string,
    connection?: PoolConnection
  ): Promise<AssetReturn | null> {
    try {
      const executor = connection ?? pool;
      const [rows] = await executor.execute(
        'SELECT * FROM asset_returns WHERE return_id = ? AND deleted_at IS NULL',
        [return_id]
      );
      const returns = rows as AssetReturn[];
      return returns[0] ?? null;
    } catch (error) {
      console.error('Error finding asset return by ID:', error);
      throw error;
    }
  }

  static async findByUserId(userId: string): Promise<AssetReturn[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_returns WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
        [userId]
      );
      return rows as AssetReturn[];
    } catch (error) {
      console.error('Error finding asset returns by user ID:', error);
      throw error;
    }
  }

  static async findByAssignmentId(
    assignmentId: string
  ): Promise<AssetReturn | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_returns WHERE assignment_id = ? AND deleted_at IS NULL',
        [assignmentId]
      );
      const returns = rows as AssetReturn[];
      return returns[0] ?? null;
    } catch (error) {
      console.error('Error finding asset return by assignment ID:', error);
      throw error;
    }
  }

  static async findByFormId(formId: string): Promise<AssetReturn[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_returns WHERE form_id = ? AND deleted_at IS NULL ORDER BY created_at ASC',
        [formId]
      );
      return rows as AssetReturn[];
    } catch (error) {
      console.error('Error finding asset returns by form ID:', error);
      throw error;
    }
  }

  /** Returns where form_id IS NULL (legacy batches). */
  static async findWithoutFormId(): Promise<AssetReturn[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_returns WHERE form_id IS NULL AND deleted_at IS NULL ORDER BY created_at DESC'
      );
      return rows as AssetReturn[];
    } catch (error) {
      console.error('Error finding asset returns without form ID:', error);
      throw error;
    }
  }

  static async update(
    return_id: string,
    assetReturnData: Partial<
      Omit<
        AssetReturn,
        'return_id' | 'created_at' | 'updated_at' | 'deleted_at'
      >
    >
  ): Promise<AssetReturn | null> {
    try {
      const updateData: any[] = [];
      const updateFields: string[] = [];

      if (assetReturnData.assignment_id !== undefined) {
        updateFields.push('assignment_id = ?');
        updateData.push(assetReturnData.assignment_id);
      }

      if (assetReturnData.user_id !== undefined) {
        updateFields.push('user_id = ?');
        updateData.push(assetReturnData.user_id);
      }

      if (assetReturnData.return_condition !== undefined) {
        updateFields.push('return_condition = ?');
        updateData.push(assetReturnData.return_condition);
      }

      if (assetReturnData.return_notes !== undefined) {
        updateFields.push('return_notes = ?');
        updateData.push(assetReturnData.return_notes);
      }

      if (assetReturnData.return_location_id !== undefined) {
        updateFields.push('return_location_id = ?');
        updateData.push(assetReturnData.return_location_id);
      }

      if (assetReturnData.return_location_room_id !== undefined) {
        updateFields.push('return_location_room_id = ?');
        updateData.push(assetReturnData.return_location_room_id);
      }

      if (assetReturnData.return_department_id !== undefined) {
        updateFields.push('return_department_id = ?');
        updateData.push(assetReturnData.return_department_id);
      }

      if (assetReturnData.return_batch_id !== undefined) {
        updateFields.push('return_batch_id = ?');
        updateData.push(assetReturnData.return_batch_id);
      }

      if (assetReturnData.form_id !== undefined) {
        updateFields.push('form_id = ?');
        updateData.push(assetReturnData.form_id);
      }

      updateFields.push('updated_at = NOW()');

      const query = `UPDATE asset_returns SET ${updateFields.join(', ')} WHERE return_id = ? AND deleted_at IS NULL`;
      updateData.push(return_id);

      await pool.execute(query, updateData);

      return this.findById(return_id);
    } catch (error) {
      console.error('Error updating asset return:', error);
      throw error;
    }
  }

  static async delete(return_id: string): Promise<void> {
    try {
      await pool.execute(
        'UPDATE asset_returns SET deleted_at = NOW() WHERE return_id = ? AND deleted_at IS NULL',
        [return_id]
      );
    } catch (error) {
      console.error('Error deleting asset return:', error);
      throw error;
    }
  }

  static async findAll(): Promise<AssetReturn[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_returns WHERE deleted_at IS NULL ORDER BY created_at DESC'
      );
      return rows as AssetReturn[];
    } catch (error) {
      console.error('Error finding all asset returns:', error);
      throw error;
    }
  }
}
