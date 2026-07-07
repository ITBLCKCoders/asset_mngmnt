import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { createMockPool } from '../helpers/mockPool.js';

const mockPool = createMockPool();

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => {
  const noop = () => {};
  return { __esModule: true, default: { info: noop, warn: noop, error: noop, debug: noop } };
});
jest.mock('../../config/validation.js', () => ({
  config: { JWT_SECRET: 'test-secret-thats-long-enough-for-jwt-hs256' },
}));

const { generateAccessToken, generateRefreshToken, generateTokens, refreshSessionTokens, verifyAccessToken } = require('../../auth/tokens.js');

describe('Auth Tokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    it('should return a valid JWT string', () => {
      const token = generateAccessToken('user-1', 'test@test.com', 'sess-1');
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should encode userId, email, and sessionId', () => {
      const token = generateAccessToken('user-1', 'test@test.com', 'sess-1');
      const decoded = jwt.decode(token) as any;
      expect(decoded.userId).toBe('user-1');
      expect(decoded.email).toBe('test@test.com');
      expect(decoded.sessionId).toBe('sess-1');
    });
  });

  describe('verifyAccessToken', () => {
    it('should return decoded payload for valid token', () => {
      const token = generateAccessToken('user-1', 'test@test.com', 'sess-1');
      const result = verifyAccessToken(token);
      expect(result).not.toBeNull();
      expect(result!.userID).toBe('user-1');
      expect(result!.email).toBe('test@test.com');
      expect(result!.sessionId).toBe('sess-1');
    });

    it('should return null for tampered token', () => {
      const result = verifyAccessToken('invalid.token.here');
      expect(result).toBeNull();
    });

    it('should return null for expired token', () => {
      const token = jwt.sign({ userId: 'user-1', email: 'test@test.com', sessionId: 'sess-1' }, 'test-secret-thats-long-enough-for-jwt-hs256', { expiresIn: '0s' });
      const result = verifyAccessToken(token);
      expect(result).toBeNull();
    });

    it('should return null for token signed with different secret', () => {
      const token = jwt.sign({ userId: 'user-1', email: 'test@test.com', sessionId: 'sess-1' }, 'different-secret-thats-long-enough-for-hmac');
      const result = verifyAccessToken(token);
      expect(result).toBeNull();
    });
  });

  describe('generateRefreshToken', () => {
    const mockReq = { headers: {}, socket: { remoteAddress: '127.0.0.1' } } as any;

    it('should return refreshToken and sessionId', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[{ deleted_count: 0 }], []]);
      const result = await generateRefreshToken('user-1', mockReq);
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('sessionId');
      expect(typeof result.refreshToken).toBe('string');
      expect(result.refreshToken.length).toBe(64);
    });

    it('should call sp_delete_sessions_by_user then sp_insert_session', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[{ deleted_count: 0 }], []]);
      await generateRefreshToken('user-1', mockReq);
      expect(mockPool.execute).toHaveBeenCalledWith('CALL sp_delete_sessions_by_user(?)', ['user-1']);
      expect(mockPool.execute).toHaveBeenCalledWith('CALL sp_insert_session(?, ?, ?, ?, ?)', expect.arrayContaining(['user-1']));
    });

    it('should log when previous sessions are deleted', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[{ deleted_count: 3 }], []]);
      await expect(generateRefreshToken('user-1', mockReq)).resolves.toBeDefined();
    });
  });

  describe('generateTokens', () => {
    const mockReq = { headers: {}, socket: { remoteAddress: '127.0.0.1' } } as any;

    it('should return both access and refresh tokens', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[{ deleted_count: 0 }], []]);
      const result = await generateTokens('user-1', 'test@test.com', mockReq);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      const decoded = jwt.decode(result.accessToken) as any;
      expect(decoded.userId).toBe('user-1');
    });
  });

  describe('refreshSessionTokens', () => {
    const mockReq = { headers: {}, socket: { remoteAddress: '192.168.1.1' } } as any;

    it('should update session and return new tokens', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);
      const result = await refreshSessionTokens('sess-1', 'user-1', 'test@test.com', mockReq);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPool.execute).toHaveBeenCalledWith(expect.stringContaining('UPDATE sessions'), expect.arrayContaining(['sess-1', 'user-1']));
    });
  });
});
