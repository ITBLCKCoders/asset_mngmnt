import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as borrowController from '../../controllers/assetBorrowRequests.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../logger.js', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../utils/audit.js', () => ({ createAuditLog: jest.fn() }));
jest.mock('../../db.js', () => ({ pool: { query: jest.fn(), execute: jest.fn() } }));
jest.mock('../../services/assetBorrowRequests.service.js', () => {
  const mockService = {
    create: jest.fn(),
    listForStaff: jest.fn(),
    listPendingDeptHeadApprovals: jest.fn(),
    listApprovedByDeptHeadMe: jest.fn(),
    approveDeptHead: jest.fn(),
    declineDeptHead: jest.fn(),
    listForCurrentUser: jest.fn(),
    listAvailableAssetsForStaffProcessing: jest.fn(),
    staffApprove: jest.fn(),
    getApprovedBorrowRequestsForReceive: jest.fn(),
    listReceivedByMe: jest.fn(),
    staffDecline: jest.fn(),
    processBorrowReturn: jest.fn(),
    receiveBorrowRequest: jest.fn(),
  };
  return { AssetBorrowRequestsService: mockService };
});

const mockPool = jest.requireMock('../../db.js') as { pool: { query: jest.Mock; execute: jest.Mock } };
const { AssetBorrowRequestsService } = jest.requireMock('../../services/assetBorrowRequests.service.js') as {
  AssetBorrowRequestsService: Record<string, jest.Mock>;
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validUUID(id = '123e4567-e89b-12d3-a456-426614174000') {
  return id;
}

describe('assetBorrowRequests.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { user: { userID: '1' }, body: {}, params: {}, query: {}, ip: '127.0.0.1', get: jest.fn() };
    res = createMockRes();
  });

  describe('createAssetBorrowRequest', () => {
    it('creates borrow request successfully', async () => {
      AssetBorrowRequestsService.create.mockResolvedValue({ id: 'br-1' });
      await borrowController.createAssetBorrowRequest(req, res);
      expect(res._json).toEqual({ success: true, data: { id: 'br-1' }, message: 'Borrow request created' });
    });

    it('returns 401 when no user', async () => {
      req.user = undefined;
      await borrowController.createAssetBorrowRequest(req, res);
      expect(res._status).toBe(401);
    });

    it('returns error from service', async () => {
      AssetBorrowRequestsService.create.mockResolvedValue({ error: 'Asset not available', status: 400 });
      await borrowController.createAssetBorrowRequest(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('listAssetBorrowRequests', () => {
    it('lists borrow requests for staff', async () => {
      AssetBorrowRequestsService.listForStaff.mockResolvedValue({ rows: [{ id: 'br-1' }] });
      await borrowController.listAssetBorrowRequests(req, res);
      expect(res._json).toEqual({ success: true, data: { borrowRequests: [{ id: 'br-1' }] } });
    });

    it('returns 401 when no user', async () => {
      req.user = undefined;
      await borrowController.listAssetBorrowRequests(req, res);
      expect(res._status).toBe(401);
    });
  });

  describe('listPendingDeptHeadBorrowRequests', () => {
    it('lists pending dept head approvals', async () => {
      AssetBorrowRequestsService.listPendingDeptHeadApprovals.mockResolvedValue({ rows: [{ id: 'br-1' }] });
      await borrowController.listPendingDeptHeadBorrowRequests(req, res);
      expect(res._json).toEqual({ success: true, data: { borrowRequests: [{ id: 'br-1' }] } });
    });
  });

  describe('listApprovedByDeptHeadMeBorrowRequests', () => {
    it('lists approved by dept head', async () => {
      AssetBorrowRequestsService.listApprovedByDeptHeadMe.mockResolvedValue({ rows: [{ id: 'br-1' }] });
      await borrowController.listApprovedByDeptHeadMeBorrowRequests(req, res);
      expect(res._json).toEqual({ success: true, data: { borrowRequests: [{ id: 'br-1' }] } });
    });
  });

  describe('approveDeptHeadBorrowRequest', () => {
    it('approves as dept head', async () => {
      req.params = { borrowRequestId: validUUID() };
      req.body = {};
      AssetBorrowRequestsService.approveDeptHead.mockResolvedValue({ ok: true });
      await borrowController.approveDeptHeadBorrowRequest(req, res);
      expect(res._json).toEqual({ success: true, data: { ok: true }, message: 'Borrow request approved' });
    });

    it('returns 400 for invalid uuid', async () => {
      req.params = { borrowRequestId: 'not-a-uuid' };
      await borrowController.approveDeptHeadBorrowRequest(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('declineDeptHeadBorrowRequest', () => {
    it('declines as dept head', async () => {
      req.params = { borrowRequestId: validUUID() };
      AssetBorrowRequestsService.declineDeptHead.mockResolvedValue({ ok: true });
      await borrowController.declineDeptHeadBorrowRequest(req, res);
      expect(res._json).toEqual({ success: true, data: { ok: true }, message: 'Borrow request declined' });
    });
  });

  describe('listMyAssetBorrowRequests', () => {
    it('lists current user requests', async () => {
      AssetBorrowRequestsService.listForCurrentUser.mockResolvedValue({ rows: [{ id: 'br-1' }] });
      await borrowController.listMyAssetBorrowRequests(req, res);
      expect(res._json).toEqual({ success: true, data: { borrowRequests: [{ id: 'br-1' }] } });
    });
  });

  describe('listBorrowRequestAvailableAssets', () => {
    it('lists available assets', async () => {
      req.params = { borrowRequestId: validUUID() };
      AssetBorrowRequestsService.listAvailableAssetsForStaffProcessing.mockResolvedValue({ assets: [{ id: 'a-1' }] });
      await borrowController.listBorrowRequestAvailableAssets(req, res);
      expect(res._json).toEqual({ success: true, data: { assets: [{ id: 'a-1' }] } });
    });
  });

  describe('staffApproveBorrowRequest', () => {
    it('staff approves borrow request', async () => {
      req.params = { borrowRequestId: validUUID() };
      req.body = { asset_code: 'AC-001', pre_usage_condition: 'Good' };
      AssetBorrowRequestsService.staffApprove.mockResolvedValue({ ok: true });
      await borrowController.staffApproveBorrowRequest(req, res);
      expect(res._json).toEqual({ success: true, data: { ok: true }, message: 'Borrow request processed' });
    });
  });

  describe('getApprovedBorrowRequestsForReceive', () => {
    it('returns approved requests for receive', async () => {
      AssetBorrowRequestsService.getApprovedBorrowRequestsForReceive.mockResolvedValue({ borrowRequests: [{ id: 'br-1' }] });
      await borrowController.getApprovedBorrowRequestsForReceive(req, res);
      expect(res._json).toEqual({ success: true, data: { borrowRequests: [{ id: 'br-1' }] } });
    });
  });

  describe('listReceivedByMeBorrowRequests', () => {
    it('returns borrow requests received by me', async () => {
      AssetBorrowRequestsService.listReceivedByMe.mockResolvedValue({ borrowRequests: [{ id: 'br-1', received_at: '2024-01-01 10:00:00' }] });
      await borrowController.listReceivedByMeBorrowRequests(req, res);
      expect(res._json).toEqual({ success: true, data: { borrowRequests: [{ id: 'br-1', received_at: '2024-01-01 10:00:00' }] } });
    });

    it('returns 401 when no user', async () => {
      req.user = undefined;
      await borrowController.listReceivedByMeBorrowRequests(req, res);
      expect(res._status).toBe(401);
    });

    it('returns error from service', async () => {
      AssetBorrowRequestsService.listReceivedByMe.mockResolvedValue({ error: 'Failed', status: 500 });
      await borrowController.listReceivedByMeBorrowRequests(req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('staffDeclineBorrowRequest', () => {
    it('staff declines borrow request', async () => {
      req.params = { borrowRequestId: validUUID() };
      req.body = { reason: 'Not needed' };
      AssetBorrowRequestsService.staffDecline.mockResolvedValue({ ok: true });
      await borrowController.staffDeclineBorrowRequest(req, res);
      expect(res._json).toEqual({ success: true, data: { ok: true }, message: 'Borrow request declined' });
    });
  });

  describe('processBorrowReturn', () => {
    it('processes borrow return', async () => {
      req.params = { borrowRequestId: validUUID() };
      req.body = { verification_received: true, verification_same_condition: true, return_condition: 'Good' };
      AssetBorrowRequestsService.processBorrowReturn.mockResolvedValue({ ok: true });
      await borrowController.processBorrowReturn(req, res);
      expect(res._json).toEqual({ success: true, data: { ok: true }, message: 'Borrow return processed' });
    });

    it('returns 400 when verification not confirmed', async () => {
      req.params = { borrowRequestId: validUUID() };
      req.body = {};
      await borrowController.processBorrowReturn(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('receiveBorrowRequest', () => {
    it('receives borrow request', async () => {
      req.params = { borrowRequestId: validUUID() };
      mockPool.pool.query.mockResolvedValue([[{ digital_signature: 'sig' }]]);
      AssetBorrowRequestsService.receiveBorrowRequest.mockResolvedValue({ ok: true });
      await borrowController.receiveBorrowRequest(req, res);
      expect(res._json).toEqual({ success: true, data: { ok: true }, message: 'Borrow request received successfully' });
    });

    it('returns 401 when no user', async () => {
      req.user = undefined;
      await borrowController.receiveBorrowRequest(req, res);
      expect(res._status).toBe(401);
    });
  });
});
