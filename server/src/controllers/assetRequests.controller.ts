import { Request, Response } from 'express';
import AssetRequestService from '../services/assetRequest.service.js';
import logger from '../logger.js';
import type { AuthRequest } from '../middleware/authenticate.js';

class AssetRequestsController {
  /**
   * Get all asset requests (admin only)
   */
  static async getAll(req: Request, res: Response) {
    try {
      const requests = await AssetRequestService.getAll();
      res.json({ requests });
    } catch (error) {
      logger.error(
        '[ASSET_REQUESTS_CONTROLLER] Error fetching all asset requests:',
        error
      );
      res.status(500).json({ error: 'Failed to fetch asset requests' });
    }
  }

  /**
   * Get asset requests for current user
   */
  static async getByCurrentUser(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userID;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userIdNum = parseInt(userId, 10);
      if (isNaN(userIdNum)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      const requests = await AssetRequestService.getByUserId(userIdNum);
      res.json({ requests });
    } catch (error) {
      logger.error(
        '[ASSET_REQUESTS_CONTROLLER] Error fetching user asset requests:',
        error
      );
      res.status(500).json({ error: 'Failed to fetch asset requests' });
    }
  }

  /**
   * Get asset request by ID
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Request ID is required' });
      }
      const requestId = parseInt(id);

      const request = await AssetRequestService.getById(requestId);
      if (!request) {
        return res.status(404).json({ error: 'Asset request not found' });
      }

      res.json({ request });
    } catch (error) {
      logger.error(
        '[ASSET_REQUESTS_CONTROLLER] Error fetching asset request:',
        error
      );
      res.status(500).json({ error: 'Failed to fetch asset request' });
    }
  }

  /**
   * Create asset request
   */
  static async create(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userID;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const {
        department_id,
        category_id,
        type_id,
        notes,
        quantity,
        admin_notes,
      } = req.body;

      const requestId = await AssetRequestService.create({
        department_id,
        category_id,
        type_id,
        notes,
        quantity,
        user_id: parseInt(userId, 10),
        admin_notes: admin_notes || '',
      });

      res.status(201).json({
        message: 'Asset request created successfully',
        requestId,
      });
    } catch (error) {
      logger.error(
        '[ASSET_REQUESTS_CONTROLLER] Error creating asset request:',
        error
      );
      res.status(500).json({ error: 'Failed to create asset request' });
    }
  }

  /**
   * Approve asset request (admin only)
   */
  static async approve(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Request ID is required' });
      }
      const requestId = parseInt(id);
      const { admin_notes } = req.body;

      const success = await AssetRequestService.approve(requestId, admin_notes);
      if (!success) {
        return res
          .status(404)
          .json({ error: 'Asset request not found or already processed' });
      }

      res.json({ message: 'Asset request approved successfully' });
    } catch (error) {
      logger.error(
        '[ASSET_REQUESTS_CONTROLLER] Error approving asset request:',
        error
      );
      res.status(500).json({ error: 'Failed to approve asset request' });
    }
  }

  /**
   * Reject asset request (admin only)
   */
  static async reject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Request ID is required' });
      }
      const requestId = parseInt(id);
      const { admin_notes } = req.body;

      const success = await AssetRequestService.reject(requestId, admin_notes);
      if (!success) {
        return res
          .status(404)
          .json({ error: 'Asset request not found or already processed' });
      }

      res.json({ message: 'Asset request rejected successfully' });
    } catch (error) {
      logger.error(
        '[ASSET_REQUESTS_CONTROLLER] Error rejecting asset request:',
        error
      );
      res.status(500).json({ error: 'Failed to reject asset request' });
    }
  }

  /**
   * Delete asset request
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'Request ID is required' });
      }
      const requestId = parseInt(id);

      const success = await AssetRequestService.delete(requestId);
      if (!success) {
        return res.status(404).json({ error: 'Asset request not found' });
      }

      res.json({ message: 'Asset request deleted successfully' });
    } catch (error) {
      logger.error(
        '[ASSET_REQUESTS_CONTROLLER] Error deleting asset request:',
        error
      );
      res.status(500).json({ error: 'Failed to delete asset request' });
    }
  }
}

export default AssetRequestsController;
