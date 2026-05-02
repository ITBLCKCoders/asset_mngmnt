import { pool } from '../db.js';

export interface User {
  userID: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_number: string;
  position: string;
  department_id: string;
  location_id: string;
  location_room_id: string;
  phone: string;
  avatar_url: string;
  is_active: number;
  is_admin: number;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  deleted_at: string | null;
}

export class UserModel {
  static async findAll(): Promise<User[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE deleted_at IS NULL'
      );
      return rows as User[];
    } catch (error) {
      console.error('Error finding all users:', error);
      throw error;
    }
  }

  static async findById(userID: string): Promise<User | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE userID = ? AND deleted_at IS NULL',
        [userID]
      );
      const users = rows as User[];
      return users[0] ?? null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  static async findByEmail(email: string): Promise<User | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL',
        [email]
      );
      const users = rows as User[];
      return users[0] ?? null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async create(
    userData: Partial<User>,
    userId: string
  ): Promise<User | null> {
    try {
      const [result] = await pool.execute(
        `INSERT INTO users (
          first_name, last_name, email, employee_number, position, 
          department_id, location_id, location_room_id, phone, avatar_url, 
          is_active, is_admin, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.first_name,
          userData.last_name,
          userData.email,
          userData.employee_number,
          userData.position,
          userData.department_id,
          userData.location_id,
          userData.location_room_id,
          userData.phone,
          userData.avatar_url,
          userData.is_active ?? 1,
          userData.is_admin ?? 0,
          userId,
          userId,
        ]
      );
      return this.findById((result as any).insertId);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async update(
    userID: string,
    userData: Partial<User>,
    userId: string
  ): Promise<User | null> {
    try {
      await pool.execute(
        `UPDATE users SET 
          first_name = ?, last_name = ?, email = ?, employee_number = ?, position = ?, 
          department_id = ?, location_id = ?, location_room_id = ?, phone = ?, avatar_url = ?, 
          is_active = ?, is_admin = ?, updated_by = ?, updated_at = NOW()
        WHERE userID = ? AND deleted_at IS NULL`,
        [
          userData.first_name,
          userData.last_name,
          userData.email,
          userData.employee_number,
          userData.position,
          userData.department_id,
          userData.location_id,
          userData.location_room_id,
          userData.phone,
          userData.avatar_url,
          userData.is_active,
          userData.is_admin,
          userId,
          userID,
        ]
      );
      return this.findById(userID);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async delete(userID: string, userId: string): Promise<void> {
    try {
      await pool.execute(
        'UPDATE users SET deleted_at = NOW(), updated_by = ? WHERE userID = ? AND deleted_at IS NULL',
        [userId, userID]
      );
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}
