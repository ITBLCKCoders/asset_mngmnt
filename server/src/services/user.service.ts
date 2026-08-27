import { User, UserModel } from '../models/user.model.js';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';

export class UserService {
  static async getUsers(): Promise<User[]> {
    try {
      logger.info('Fetching all users from database');
      const users = await UserModel.findAll();
      logger.info(`Found ${users.length} users`);
      return users;
    } catch (error) {
      logger.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  static async getUserById(userID: string): Promise<User | null> {
    try {
      logger.info(`Fetching user by ID: ${userID}`);
      const user = await UserModel.findById(userID);

      if (user) {
        logger.info(`Found user: ${user.first_name} ${user.last_name}`);
        return user;
      }

      logger.warn(`User not found: ${userID}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching user ${userID}:`, error);
      throw new Error('Failed to fetch user');
    }
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      logger.info(`Fetching user by email: ${email}`);
      const user = await UserModel.findByEmail(email);

      if (user) {
        logger.info(`Found user: ${user.first_name} ${user.last_name}`);
        return user;
      }

      logger.warn(`User not found: ${email}`);
      return null;
    } catch (error) {
      logger.error(`Error fetching user ${email}:`, error);
      throw new Error('Failed to fetch user');
    }
  }

  static async createUser(
    userData: Partial<User>,
    userId: string
  ): Promise<User | null> {
    try {
      logger.info('Creating new user:', {
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
      });

      // Validate required fields
      if (!userData.first_name || !userData.last_name || !userData.email) {
        throw new Error('First name, last name, and email are required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        throw new Error('Invalid email format');
      }

      // Check if email already exists
      const existingUser = await UserModel.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Create the user
      const newUser = await UserModel.create(userData, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Created User',
        resourceType: 'user',
        resourceId: newUser?.userID || '',
        resourceName: `${newUser?.first_name} ${newUser?.last_name}`,
        details: `Created new user with email ${newUser?.email}`,
        newValues: {
          first_name: newUser?.first_name,
          last_name: newUser?.last_name,
          email: newUser?.email,
          is_admin: newUser?.is_admin,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`User created successfully: ${newUser?.userID}`);
      return newUser;
    } catch (error) {
      logger.error('Error creating user:', error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to create user');
    }
  }

  static async updateUser(
    userID: string,
    userData: Partial<User>,
    userId: string
  ): Promise<User | null> {
    try {
      logger.info(`Updating user: ${userID}`);

      // Check if user exists
      const existingUser = await UserModel.findById(userID);

      if (!existingUser) {
        throw new Error('User not found');
      }

      // Validate email format if provided
      if (userData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
          throw new Error('Invalid email format');
        }

        // Check if email already exists for a different user
        const existingUserByEmail = await UserModel.findByEmail(userData.email);
        if (existingUserByEmail && existingUserByEmail.userID !== userID) {
          throw new Error('Email already exists');
        }
      }

      // Update the user
      const updatedUser = await UserModel.update(userID, userData, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Updated User',
        resourceType: 'user',
        resourceId: existingUser.userID,
        resourceName: `${existingUser.first_name} ${existingUser.last_name}`,
        details: 'Updated user details',
        oldValues: {
          first_name: existingUser.first_name,
          last_name: existingUser.last_name,
          email: existingUser.email,
          is_admin: existingUser.is_admin,
        },
        newValues: {
          first_name: updatedUser?.first_name,
          last_name: updatedUser?.last_name,
          email: updatedUser?.email,
          is_admin: updatedUser?.is_admin,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`User updated successfully: ${userID}`);
      return updatedUser;
    } catch (error) {
      logger.error(`Error updating user ${userID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to update user');
    }
  }

  static async deleteUser(userID: string, userId: string): Promise<void> {
    try {
      logger.info(`Deleting user: ${userID}`);

      // Check if user exists
      const existingUser = await UserModel.findById(userID);

      if (!existingUser) {
        throw new Error('User not found');
      }

      await UserModel.delete(userID, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Deleted User',
        resourceType: 'user',
        resourceId: existingUser.userID,
        resourceName: `${existingUser.first_name} ${existingUser.last_name}`,
        details: `Deleted user ${existingUser.email}`,
        oldValues: {
          first_name: existingUser.first_name,
          last_name: existingUser.last_name,
          email: existingUser.email,
          is_admin: existingUser.is_admin,
        },
        newValues: null,
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(`User deleted successfully: ${userID}`);
    } catch (error) {
      logger.error(`Error deleting user ${userID}:`, error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to delete user');
    }
  }
}
