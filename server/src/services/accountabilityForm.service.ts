import {
  AccountabilityForm,
  AccountabilityFormModel,
} from '../models/accountabilityForm.model';
import logger from '../logger.js';
import { createAuditLog } from '../utils/audit.js';

export class AccountabilityFormService {
  static async getAccountabilityForms(): Promise<AccountabilityForm[]> {
    try {
      logger.info('Fetching all accountability forms from database');
      const forms = await AccountabilityFormModel.findAll();
      logger.info(`Found ${forms.length} accountability forms`);
      return forms;
    } catch (error) {
      logger.error('Error fetching accountability forms:', error);
      throw new Error('Failed to fetch accountability forms');
    }
  }

  static async getAccountabilityFormById(
    accountabilityFormID: string
  ): Promise<AccountabilityForm | null> {
    try {
      logger.info(
        `Fetching accountability form by ID: ${accountabilityFormID}`
      );
      const form = await AccountabilityFormModel.findById(accountabilityFormID);

      if (form) {
        logger.info(`Found accountability form for asset ID: ${form.asset_id}`);
        return form;
      }

      logger.warn(`Accountability form not found: ${accountabilityFormID}`);
      return null;
    } catch (error) {
      logger.error(
        `Error fetching accountability form ${accountabilityFormID}:`,
        error
      );
      throw new Error('Failed to fetch accountability form');
    }
  }

  static async getAccountabilityFormsByAssetId(
    asset_id: string
  ): Promise<AccountabilityForm[]> {
    try {
      logger.info(`Fetching accountability forms by asset ID: ${asset_id}`);
      const forms = await AccountabilityFormModel.findByAssetId(asset_id);
      logger.info(
        `Found ${forms.length} accountability forms for asset ${asset_id}`
      );
      return forms;
    } catch (error) {
      logger.error(
        `Error fetching accountability forms by asset ${asset_id}:`,
        error
      );
      throw new Error('Failed to fetch accountability forms');
    }
  }

  static async getAccountabilityFormsByUserId(
    user_id: string
  ): Promise<AccountabilityForm[]> {
    try {
      logger.info(`Fetching accountability forms by user ID: ${user_id}`);
      const forms = await AccountabilityFormModel.findByUserId(user_id);
      logger.info(
        `Found ${forms.length} accountability forms for user ${user_id}`
      );
      return forms;
    } catch (error) {
      logger.error(
        `Error fetching accountability forms by user ${user_id}:`,
        error
      );
      throw new Error('Failed to fetch accountability forms');
    }
  }

  static async createAccountabilityForm(
    formData: Partial<AccountabilityForm>,
    userId: string
  ): Promise<AccountabilityForm | null> {
    try {
      logger.info('Creating new accountability form:', {
        asset_id: formData.asset_id,
        user_id: formData.user_id,
      });

      // Validate required fields
      if (
        !formData.asset_id ||
        !formData.user_id ||
        !formData.assigned_date ||
        !formData.due_date
      ) {
        throw new Error(
          'Asset ID, user ID, assigned date, and due date are required'
        );
      }

      // Create the accountability form
      const newForm = await AccountabilityFormModel.create(formData, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Created Accountability Form',
        resourceType: 'accountability-form',
        resourceId: newForm?.accountabilityFormID || '',
        resourceName: `Asset ${newForm?.asset_id} - User ${newForm?.user_id}`,
        details: `Created accountability form for asset ${newForm?.asset_id} and user ${newForm?.user_id}`,
        newValues: {
          asset_id: newForm?.asset_id,
          user_id: newForm?.user_id,
          status: newForm?.status,
          assigned_date: newForm?.assigned_date,
          due_date: newForm?.due_date,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(
        `Accountability form created successfully: ${newForm?.accountabilityFormID}`
      );
      return newForm;
    } catch (error) {
      logger.error('Error creating accountability form:', error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to create accountability form');
    }
  }

  static async updateAccountabilityForm(
    accountabilityFormID: string,
    formData: Partial<AccountabilityForm>,
    userId: string
  ): Promise<AccountabilityForm | null> {
    try {
      logger.info(`Updating accountability form: ${accountabilityFormID}`);

      // Check if accountability form exists
      const existingForm =
        await AccountabilityFormModel.findById(accountabilityFormID);

      if (!existingForm) {
        throw new Error('Accountability form not found');
      }

      // Update the accountability form
      const updatedForm = await AccountabilityFormModel.update(
        accountabilityFormID,
        formData,
        userId
      );

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Updated Accountability Form',
        resourceType: 'accountability-form',
        resourceId: existingForm.accountabilityFormID,
        resourceName: `Asset ${existingForm.asset_id} - User ${existingForm.user_id}`,
        details: 'Updated accountability form details',
        oldValues: {
          asset_id: existingForm.asset_id,
          user_id: existingForm.user_id,
          status: existingForm.status,
          assigned_date: existingForm.assigned_date,
          due_date: existingForm.due_date,
          returned_date: existingForm.returned_date,
          notes: existingForm.notes,
        },
        newValues: {
          asset_id: updatedForm?.asset_id,
          user_id: updatedForm?.user_id,
          status: updatedForm?.status,
          assigned_date: updatedForm?.assigned_date,
          due_date: updatedForm?.due_date,
          returned_date: updatedForm?.returned_date,
          notes: updatedForm?.notes,
        },
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(
        `Accountability form updated successfully: ${accountabilityFormID}`
      );
      return updatedForm;
    } catch (error) {
      logger.error(
        `Error updating accountability form ${accountabilityFormID}:`,
        error
      );

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to update accountability form');
    }
  }

  static async deleteAccountabilityForm(
    accountabilityFormID: string,
    userId: string
  ): Promise<void> {
    try {
      logger.info(`Deleting accountability form: ${accountabilityFormID}`);

      // Check if accountability form exists
      const existingForm =
        await AccountabilityFormModel.findById(accountabilityFormID);

      if (!existingForm) {
        throw new Error('Accountability form not found');
      }

      await AccountabilityFormModel.delete(accountabilityFormID, userId);

      // Create audit log
      await createAuditLog({
        userId,
        action: 'Deleted Accountability Form',
        resourceType: 'accountability-form',
        resourceId: existingForm.accountabilityFormID,
        resourceName: `Asset ${existingForm.asset_id} - User ${existingForm.user_id}`,
        details: `Deleted accountability form for asset ${existingForm.asset_id} and user ${existingForm.user_id}`,
        oldValues: {
          asset_id: existingForm.asset_id,
          user_id: existingForm.user_id,
          status: existingForm.status,
          assigned_date: existingForm.assigned_date,
          due_date: existingForm.due_date,
          returned_date: existingForm.returned_date,
          notes: existingForm.notes,
        },
        newValues: null,
        ipAddress: '', // This would come from the request
        userAgent: '', // This would come from the request
      });

      logger.info(
        `Accountability form deleted successfully: ${accountabilityFormID}`
      );
    } catch (error) {
      logger.error(
        `Error deleting accountability form ${accountabilityFormID}:`,
        error
      );

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to delete accountability form');
    }
  }

  static async markFormAsReturned(
    accountabilityFormID: string,
    returnedDate: string,
    userId: string
  ): Promise<AccountabilityForm | null> {
    try {
      logger.info(
        `Marking accountability form as returned: ${accountabilityFormID}`
      );

      const updatedForm = await this.updateAccountabilityForm(
        accountabilityFormID,
        {
          returned_date: returnedDate,
          status: 'returned',
        },
        userId
      );

      logger.info(
        `Accountability form marked as returned: ${accountabilityFormID}`
      );
      return updatedForm;
    } catch (error) {
      logger.error(
        `Error marking accountability form as returned ${accountabilityFormID}:`,
        error
      );
      throw new Error('Failed to mark accountability form as returned');
    }
  }
}
