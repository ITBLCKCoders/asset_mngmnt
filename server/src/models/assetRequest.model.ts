import { pool } from '../db.js';

export interface AssetRequest {
  id: number;
  department_id: string;
  category_id: string;
  type_id: string;
  request_date: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string;
  quantity: number;
  user_id: string;
  admin_notes: string;
  processed_date?: string;
}

export interface AssetRequestWithDetails extends AssetRequest {
  department?: { id: string; name: string };
  category?: { id: string; name: string };
  type?: { id: string; name: string };
  user?: { id: string; username: string; name: string };
}

class AssetRequestModel {
  /**
   * Get all asset requests
   */
  static async getAll(): Promise<AssetRequestWithDetails[]> {
    const [result] = await pool.query(`
      SELECT
        ar.id as requestID,
        ar.department_id,
        ar.category_id,
        ar.type_id,
        ar.request_date,
        ar.status,
        ar.notes,
        ar.quantity,
        ar.user_id,
        ar.admin_notes,
        ar.processed_date,
        d.departmentID as department_name_id,
        d.name as department_name,
        c.categoryID as category_name_id,
        c.name as category_name,
        at.typeID as type_name_id,
        at.name as type_name,
        u.userID as user_id,
        u.username as user_username,
        u.name as user_name
      FROM asset_requests ar
      LEFT JOIN asset_mngmnt_departments d ON ar.department_id = d.departmentID
      LEFT JOIN asset_categories c ON ar.category_id = c.categoryID
      LEFT JOIN asset_types at ON ar.type_id = at.typeID
      LEFT JOIN users u ON ar.user_id = u.userID
      ORDER BY ar.request_date DESC
    `);

    return (result as any[]).map((row: any) => ({
      id: row.requestID,
      department_id: row.department_id,
      category_id: row.category_id,
      type_id: row.type_id,
      request_date: row.request_date,
      status: row.status,
      notes: row.notes,
      quantity: row.quantity,
      user_id: row.user_id,
      admin_notes: row.admin_notes,
      processed_date: row.processed_date,
      department: {
        id: row.department_id,
        name: row.department_name,
      },
      category: {
        id: row.category_id,
        name: row.category_name,
      },
      type: {
        id: row.type_id,
        name: row.type_name,
      },
      user: {
        id: row.user_id,
        username: row.user_username,
        name: row.user_name,
      },
    }));
  }

  /**
   * Get asset requests by user ID
   */
  static async getByUserId(userId: string): Promise<AssetRequestWithDetails[]> {
    const [result] = await pool.query(
      `
      SELECT
        ar.id as requestID,
        ar.department_id,
        ar.category_id,
        ar.type_id,
        ar.request_date,
        ar.status,
        ar.notes,
        ar.quantity,
        ar.user_id,
        ar.admin_notes,
        ar.processed_date,
        d.departmentID as department_name_id,
        d.name as department_name,
        c.categoryID as category_name_id,
        c.name as category_name,
        at.typeID as type_name_id,
        at.name as type_name
      FROM asset_requests ar
      LEFT JOIN asset_mngmnt_departments d ON ar.department_id = d.departmentID
      LEFT JOIN asset_categories c ON ar.category_id = c.categoryID
      LEFT JOIN asset_types at ON ar.type_id = at.typeID
      WHERE ar.user_id = ?
      ORDER BY ar.request_date DESC
    `,
      [userId]
    );

    return (result as any[]).map((row: any) => ({
      id: row.requestID,
      department_id: row.department_id,
      category_id: row.category_id,
      type_id: row.type_id,
      request_date: row.request_date,
      status: row.status,
      notes: row.notes,
      quantity: row.quantity,
      user_id: row.user_id,
      admin_notes: row.admin_notes,
      processed_date: row.processed_date,
      department: {
        id: row.department_id,
        name: row.department_name,
      },
      category: {
        id: row.category_id,
        name: row.category_name,
      },
      type: {
        id: row.type_id,
        name: row.type_name,
      },
    }));
  }

  /**
   * Get asset request by ID
   */
  static async getById(id: number): Promise<AssetRequest | null> {
    const [result] = await pool.query(
      `
      SELECT * FROM asset_requests WHERE id = ?
    `,
      [id]
    );

    return (result as any[])[0] || null;
  }

  /**
   * Create a new asset request
   */
  static async create(
    requestData: Omit<
      AssetRequest,
      'id' | 'request_date' | 'status' | 'processed_date'
    >
  ): Promise<number> {
    const [result] = await pool.query(
      `
      INSERT INTO asset_requests
        (department_id, category_id, type_id, notes, quantity, user_id, status, request_date)
      VALUES
        (?, ?, ?, ?, ?, ?, 'pending', NOW())
    `,
      [
        requestData.department_id,
        requestData.category_id,
        requestData.type_id,
        requestData.notes,
        requestData.quantity,
        requestData.user_id,
      ]
    );

    return (result as any).insertId;
  }

  /**
   * Approve an asset request
   */
  static async approve(id: number, adminNotes: string): Promise<boolean> {
    const [result] = await pool.query(
      `
      UPDATE asset_requests
      SET status = 'approved', admin_notes = ?, processed_date = NOW()
      WHERE id = ? AND status = 'pending'
    `,
      [adminNotes, id]
    );

    return (result as any).affectedRows > 0;
  }

  /**
   * Reject an asset request
   */
  static async reject(id: number, adminNotes: string): Promise<boolean> {
    const [result] = await pool.query(
      `
      UPDATE asset_requests
      SET status = 'rejected', admin_notes = ?, processed_date = NOW()
      WHERE id = ? AND status = 'pending'
    `,
      [adminNotes, id]
    );

    return (result as any).affectedRows > 0;
  }

  /**
   * Delete an asset request
   */
  static async delete(id: number): Promise<boolean> {
    const [result] = await pool.query(
      `
      DELETE FROM asset_requests WHERE id = ?
    `,
      [id]
    );

    return (result as any).affectedRows > 0;
  }
}

export default AssetRequestModel;
