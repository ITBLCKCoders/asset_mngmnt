import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as gatePassController from '../../controllers/gatePass.controller.js';
import { createMockRes } from '../helpers/mockRes.js';

jest.mock('../../logger.js', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../services/gatePass.service.js', () => ({
  createGatePass: jest.fn(),
  getGatePassById: jest.fn(),
  getAllGatePasses: jest.fn(),
  updateGatePass: jest.fn(),
  deleteGatePass: jest.fn(),
}));
jest.mock('../../dtos/gatePass/CreateGatePassDto.js', () => {
  const mockSafeParse = jest.fn();
  return {
    CreateGatePassDtoSchema: { safeParse: mockSafeParse },
    UpdateGatePassDtoSchema: { safeParse: jest.fn() },
  };
});

const gatePassService = jest.requireMock('../../services/gatePass.service.js') as {
  createGatePass: jest.Mock;
  getGatePassById: jest.Mock;
  getAllGatePasses: jest.Mock;
  updateGatePass: jest.Mock;
  deleteGatePass: jest.Mock;
};
const { CreateGatePassDtoSchema, UpdateGatePassDtoSchema } = jest.requireMock('../../dtos/gatePass/CreateGatePassDto.js') as {
  CreateGatePassDtoSchema: { safeParse: jest.Mock };
  UpdateGatePassDtoSchema: { safeParse: jest.Mock };
};

describe('gatePass.controller', () => {
  let req: any;
  let res: ReturnType<typeof createMockRes>;

  beforeEach(() => {
    jest.resetAllMocks();
    req = { user: { userID: '1' }, body: {}, params: {}, query: {} };
    res = createMockRes();
  });

  describe('createGatePassHandler', () => {
    it('creates gate pass successfully', async () => {
      const validData = { assignmentId: 'a-1', assetId: 'asset-1', userId: 'u-1', purpose: 'Transport', condition: 'Good' };
      CreateGatePassDtoSchema.safeParse.mockReturnValue({ success: true, data: validData });
      gatePassService.createGatePass.mockResolvedValue('gp-1');
      await gatePassController.createGatePassHandler(req, res);
      expect(res._json).toEqual({ success: true, data: { gatePassId: 'gp-1' }, message: 'Gate pass created successfully' });
    });

    it('returns 400 on validation failure', async () => {
      CreateGatePassDtoSchema.safeParse.mockReturnValue({ success: false, error: { errors: [{ path: ['assignmentId'], message: 'Required' }] } });
      await gatePassController.createGatePassHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 500 on error', async () => {
      CreateGatePassDtoSchema.safeParse.mockReturnValue({ success: true, data: { assignmentId: 'a-1', assetId: 'asset-1', userId: 'u-1', purpose: 'Transport', condition: 'Good' } });
      gatePassService.createGatePass.mockRejectedValue(new Error('DB error'));
      await gatePassController.createGatePassHandler(req, res);
      expect(res._status).toBe(500);
    });
  });

  describe('getGatePassHandler', () => {
    it('returns gate pass by id', async () => {
      req.params = { id: 'gp-1' };
      gatePassService.getGatePassById.mockResolvedValue({ gatePassId: 'gp-1', purpose: 'Transport' });
      await gatePassController.getGatePassHandler(req, res);
      expect(res._json).toEqual({ success: true, data: { gatePassId: 'gp-1', purpose: 'Transport' } });
    });

    it('returns 400 when no id', async () => {
      await gatePassController.getGatePassHandler(req, res);
      expect(res._status).toBe(400);
    });

    it('returns 404 when not found', async () => {
      req.params = { id: 'gp-999' };
      gatePassService.getGatePassById.mockResolvedValue(null);
      await gatePassController.getGatePassHandler(req, res);
      expect(res._status).toBe(404);
    });
  });

  describe('getAllGatePassesHandler', () => {
    it('returns all gate passes', async () => {
      gatePassService.getAllGatePasses.mockResolvedValue([{ gatePassId: 'gp-1' }]);
      await gatePassController.getAllGatePassesHandler(req, res);
      expect(res._json).toEqual({ success: true, data: { gatePasses: [{ gatePassId: 'gp-1' }] } });
    });

    it('passes query filters', async () => {
      req.query = { status: 'Active', userId: 'u-1' };
      await gatePassController.getAllGatePassesHandler(req, res);
      expect(gatePassService.getAllGatePasses).toHaveBeenCalledWith({ status: 'Active', userId: 'u-1' });
    });
  });

  describe('updateGatePassHandler', () => {
    it('updates gate pass successfully', async () => {
      UpdateGatePassDtoSchema.safeParse.mockReturnValue({ success: true, data: { gatePassId: 'gp-1', status: 'Completed' } });
      await gatePassController.updateGatePassHandler(req, res);
      expect(res._json).toEqual({ success: true, data: null, message: 'Gate pass updated successfully' });
    });

    it('returns 400 on validation failure', async () => {
      UpdateGatePassDtoSchema.safeParse.mockReturnValue({ success: false, error: { errors: [{ path: ['status'], message: 'Invalid' }] } });
      await gatePassController.updateGatePassHandler(req, res);
      expect(res._status).toBe(400);
    });
  });

  describe('deleteGatePassHandler', () => {
    it('deletes gate pass successfully', async () => {
      req.params = { id: 'gp-1' };
      await gatePassController.deleteGatePassHandler(req, res);
      expect(res._json).toEqual({ success: true, data: null, message: 'Gate pass deleted successfully' });
    });

    it('returns 400 when no id', async () => {
      await gatePassController.deleteGatePassHandler(req, res);
      expect(res._status).toBe(400);
    });
  });
});
