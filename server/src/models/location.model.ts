import { pool } from '../db.js';

export interface Location {
  locationID: string;
  name: string;
  description: string;
  address: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  deleted_at: string | null;
}

export class LocationModel {
  static async findAll(): Promise<Location[]> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_locations WHERE deleted_at IS NULL'
      );
      return rows as Location[];
    } catch (error) {
      console.error('Error finding all locations:', error);
      throw error;
    }
  }

  static async findById(locationID: string): Promise<Location | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_locations WHERE locationID = ? AND deleted_at IS NULL',
        [locationID]
      );
      const locations = rows as Location[];
      return locations[0] ?? null;
    } catch (error) {
      console.error('Error finding location by ID:', error);
      throw error;
    }
  }

  static async findByName(name: string): Promise<Location | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM asset_mngmnt_locations WHERE name = ? AND deleted_at IS NULL',
        [name]
      );
      const locations = rows as Location[];
      return locations[0] ?? null;
    } catch (error) {
      console.error('Error finding location by name:', error);
      throw error;
    }
  }

  static async create(
    locationData: Partial<Location>,
    userId: string
  ): Promise<Location | null> {
    try {
      const [result] = await pool.execute(
        'INSERT INTO asset_mngmnt_locations (name, description, address, created_by, updated_by) VALUES (?, ?, ?, ?, ?)',
        [
          locationData.name,
          locationData.description,
          locationData.address,
          userId,
          userId,
        ]
      );
      return this.findById((result as any).insertId);
    } catch (error) {
      console.error('Error creating location:', error);
      throw error;
    }
  }

  static async update(
    locationID: string,
    locationData: Partial<Location>,
    userId: string
  ): Promise<Location | null> {
    try {
      await pool.execute(
        'UPDATE asset_mngmnt_locations SET name = ?, description = ?, address = ?, updated_by = ?, updated_at = NOW() WHERE locationID = ? AND deleted_at IS NULL',
        [
          locationData.name,
          locationData.description,
          locationData.address,
          userId,
          locationID,
        ]
      );
      return this.findById(locationID);
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  }

  static async delete(locationID: string, userId: string): Promise<void> {
    try {
      await pool.execute(
        'UPDATE asset_mngmnt_locations SET deleted_at = NOW(), updated_by = ? WHERE locationID = ? AND deleted_at IS NULL',
        [userId, locationID]
      );
    } catch (error) {
      console.error('Error deleting location:', error);
      throw error;
    }
  }
}
