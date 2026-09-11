import AssetRequestModel, {
  AssetRequest,
  AssetRequestWithDetails,
} from '../models/assetRequest.model.js';
import logger from '../logger.js';

class AssetRequestService {
  /**
   * Get all asset requests
   */
  static async getAll(): Promise<AssetRequestWithDetails[]> {
    try {
      const requests = await AssetRequestModel.getAll();
      logger.info(
        `[ASSET_REQUEST_SERVICE] Retrieved ${requests.length} asset requests`
      );
      return requests;
    } catch (error) {
      logger.error(
        '[ASSET_REQUEST_SERVICE] Error getting all asset requests:',
        error
      );
      throw new Error('Failed to get asset requests');
    }
  }

  /**
   * Get asset requests by user ID
   */
  static async getByUserId(userId: string): Promise<AssetRequestWithDetails[]> {
    try {
      if (!userId || !userId.trim()) {
        throw new Error('Invalid user ID');
      }

      const requests = await AssetRequestModel.getByUserId(userId);
      logger.info(
        `[ASSET_REQUEST_SERVICE] Retrieved ${requests.length} asset requests for user ${userId}`
      );
      return requests;
    } catch (error) {
      logger.error(
        `[ASSET_REQUEST_SERVICE] Error getting asset requests for user ${userId}:`,
        error
      );
      throw new Error('Failed to get user asset requests');
    }
  }

  /**
   * Get asset request by ID
   */
  static async getById(id: number): Promise<AssetRequest | null> {
    try {
      if (!id || id <= 0) {
        throw new Error('Invalid request ID');
      }

      const request = await AssetRequestModel.getById(id);
      logger.info(`[ASSET_REQUEST_SERVICE] Retrieved asset request ${id}`);
      return request;
    } catch (error) {
      logger.error(
        `[ASSET_REQUEST_SERVICE] Error getting asset request ${id}:`,
        error
      );
      throw new Error('Failed to get asset request');
    }
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
    try {
      // Validate request data
      if (!requestData.department_id || !String(requestData.department_id).trim()) {
        throw new Error('Department ID is required');
      }

      if (!requestData.category_id || !String(requestData.category_id).trim()) {
        throw new Error('Category ID is required');
      }

      if (!requestData.type_id || !String(requestData.type_id).trim()) {
        throw new Error('Type ID is required');
      }

      if (!requestData.quantity || requestData.quantity < 1) {
        throw new Error('Quantity must be at least 1');
      }

      if (!requestData.user_id || !String(requestData.user_id).trim()) {
        throw new Error('User ID is required');
      }

      const requestId = await AssetRequestModel.create(requestData);
      logger.info(
        `[ASSET_REQUEST_SERVICE] Created asset request ${requestId} for user ${requestData.user_id}`
      );
      return requestId;
    } catch (error) {
      logger.error(
        '[ASSET_REQUEST_SERVICE] Error creating asset request:',
        error
      );
      throw new Error('Failed to create asset request');
    }
  }

  /**
   * Approve an asset request
   */
  static async approve(id: number, adminNotes: string): Promise<boolean> {
    try {
      if (!id || id <= 0) {
        throw new Error('Invalid request ID');
      }

      // Check if request exists and is pending
      const request = await AssetRequestModel.getById(id);
      if (!request) {
        throw new Error('Asset request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('Asset request is not in pending state');
      }

      const success = await AssetRequestModel.approve(id, adminNotes);
      if (!success) {
        throw new Error('Failed to approve asset request');
      }

      logger.info(`[ASSET_REQUEST_SERVICE] Approved asset request ${id}`);
      return true;
    } catch (error) {
      logger.error(
        `[ASSET_REQUEST_SERVICE] Error approving asset request ${id}:`,
        error
      );
      throw new Error('Failed to approve asset request');
    }
  }

  /**
   * Reject an asset request
   */
  static async reject(id: number, adminNotes: string): Promise<boolean> {
    try {
      if (!id || id <= 0) {
        throw new Error('Invalid request ID');
      }

      // Check if request exists and is pending
      const request = await AssetRequestModel.getById(id);
      if (!request) {
        throw new Error('Asset request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('Asset request is not in pending state');
      }

      const success = await AssetRequestModel.reject(id, adminNotes);
      if (!success) {
        throw new Error('Failed to reject asset request');
      }

      logger.info(`[ASSET_REQUEST_SERVICE] Rejected asset request ${id}`);
      return true;
    } catch (error) {
      logger.error(
        `[ASSET_REQUEST_SERVICE] Error rejecting asset request ${id}:`,
        error
      );
      throw new Error('Failed to reject asset request');
    }
  }

  /**
   * Delete an asset request
   */
  static async delete(id: number): Promise<boolean> {
    try {
      if (!id || id <= 0) {
        throw new Error('Invalid request ID');
      }

      // Check if request exists
      const request = await AssetRequestModel.getById(id);
      if (!request) {
        throw new Error('Asset request not found');
      }

      const success = await AssetRequestModel.delete(id);
      if (!success) {
        throw new Error('Failed to delete asset request');
      }

      logger.info(`[ASSET_REQUEST_SERVICE] Deleted asset request ${id}`);
      return true;
    } catch (error) {
      logger.error(
        `[ASSET_REQUEST_SERVICE] Error deleting asset request ${id}:`,
        error
      );
      throw new Error('Failed to delete asset request');
    }
  }
}

export default AssetRequestService;
