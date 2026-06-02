import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createMockPool } from '../helpers/mockPool.js';

const mockPool = createMockPool();
const mockGenerateTokens = jest.fn();
const mockValidatePassword = jest.fn();
const mockCheckPasswordExpiration = jest.fn();
const mockSettingGetValue = jest.fn();
const mockNotificationServiceCreate = jest.fn();
const mockGetIoInstance = jest.fn();
const mockEmitNotification = jest.fn();

jest.mock('../../db.js', () => ({ pool: mockPool }));
jest.mock('../../logger.js', () => {
  const noop = () => {};
  return { __esModule: true, default: { info: noop, warn: noop, error: noop, debug: noop } };
});
jest.mock('../../auth/tokens.js', () => ({
  generateTokens: (...args: any[]) => mockGenerateTokens(...args),
}));
jest.mock('../../auth/password.js', () => ({
  validatePassword: (...args: any[]) => mockValidatePassword(...args),
  checkPasswordExpiration: (...args: any[]) => mockCheckPasswordExpiration(...args),
}));
jest.mock('../../models/setting.model.js', () => ({
  SettingModel: { getValue: (...args: any[]) => mockSettingGetValue(...args) },
}));
jest.mock('uuid', () => ({ v4: () => 'mocked-uuid-v4' }));
jest.mock('../../services/notification.service.js', () => ({
  NotificationService: { createNotification: (...args: any[]) => mockNotificationServiceCreate(...args) },
}));
jest.mock('../../utils/socketManager.js', () => ({
  getIoInstance: (...args: any[]) => mockGetIoInstance(...args),
}));
jest.mock('../../sockets/socketHandlers.js', () => ({
  emitNotification: (...args: any[]) => mockEmitNotification(...args),
}));

const { register, login, generatePasswordChangeToken } = require('../../auth/user.js');

describe('Auth User (register/login)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateTokens.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });
    mockValidatePassword.mockResolvedValue({ valid: true });
    mockCheckPasswordExpiration.mockResolvedValue({ expired: false, expiringSoon: false });
  });

  describe('register', () => {
    const regData = {
      firstName: 'John', lastName: 'Doe', username: 'johndoe',
      contactNumber: '09123456789', company_id: 'c1', department_id: 'd1',
      employeeNumber: 'EMP001', position: 'Developer',
    };

    it('should create user when no conflicts', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[[]], []]);
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);
      const result = await register('john@test.com', 'StrongP@ss1', regData);
      expect(result).toHaveProperty('userId');
      expect(result.message).toContain('Registration successful');
    });

    it('should return error when email already exists', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ email: 'john@test.com' }], []]);
      const result = await register('john@test.com', 'StrongP@ss1', regData);
      expect(result.error).toContain('Email');
    });

    it('should return error when username already exists', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[{ username: 'johndoe' }], []]);
      const result = await register('john@test.com', 'StrongP@ss1', regData);
      expect(result.error).toContain('Username');
    });

    it('should return error when password is weak', async () => {
      mockValidatePassword.mockResolvedValue({ valid: false, error: 'Password too weak' });
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);
      const result = await register('john@test.com', 'weak', regData);
      expect(result.error).toBe('Password too weak');
    });
  });

  describe('login', () => {
    const mockReq = { headers: {}, socket: { remoteAddress: '127.0.0.1' } } as any;
    const makeUser = (overrides = {}) => ({
      userID: 'u1', email: 'user@test.com', password: '',
      is_active: 1, verified: 1, mfa_enabled: 0, failed_login_attempts: 0,
      lockout_until: null, lockout_count: 0, must_change_password: 0,
      password_last_changed: new Date().toISOString(),
      username: 'testuser',
      ...overrides,
    });

    it('should return null when user not found', async () => {
      (mockPool.execute as jest.Mock).mockResolvedValue([[[]], []]);
      const result = await login('missing@test.com', 'pass', mockReq);
      expect(result).toBeNull();
    });

    it('should return error when account is inactive', async () => {
      const user = makeUser({ is_active: 0 });
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[user], []]);
      const result = await login('user@test.com', 'pass', mockReq);
      expect(result.error).toContain('inactive');
    });

    it('should return error when account is locked', async () => {
      const future = new Date(Date.now() + 30 * 60 * 1000);
      const user = makeUser({ lockout_until: future.toISOString() });
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[user], []]);
      const result = await login('user@test.com', 'pass', mockReq);
      expect(result.error).toContain('locked');
    });

    it('should increment attempts on wrong password', async () => {
      const hashed = await bcrypt.hash('correct-pass', 4);
      const user = makeUser({ password: hashed });
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[user], []]);
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);
      const result = await login('user@test.com', 'wrong-pass', mockReq);
      expect(result).toBeNull();
      expect(mockPool.execute).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET failed_login_attempts'), expect.any(Array));
    });

    it('should lock account after max attempts', async () => {
      const hashed = await bcrypt.hash('correct-pass', 4);
      const user = makeUser({ password: hashed, failed_login_attempts: 4 });
      mockSettingGetValue.mockImplementation((key: string) => {
        if (key === 'max_login_attempts') return 5;
        if (key === 'lockout_duration_minutes') return 30;
        return null;
      });
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[user], []]);
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);
      mockNotificationServiceCreate.mockResolvedValue({ notificationID: 'n1' });
      mockGetIoInstance.mockReturnValue({});

      const result = await login('user@test.com', 'wrong-pass', mockReq);
      expect(result.error).toContain('locked');
    });

    it('should return error when email not verified', async () => {
      const hashed = await bcrypt.hash('correct-pass', 4);
      const user = makeUser({ password: hashed, verified: 0 });
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[user], []]);
      const result = await login('user@test.com', 'correct-pass', mockReq);
      expect(result.error).toContain('not verified');
    });

    it('should return mustChangePassword when flag is set', async () => {
      const hashed = await bcrypt.hash('correct-pass', 4);
      const user = makeUser({ password: hashed, must_change_password: 1 });
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[user], []]);
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);
      const result = await login('user@test.com', 'correct-pass', mockReq);
      expect(result.mustChangePassword).toBe(true);
      expect(result.tempToken).toBeDefined();
    });

    it('should return passwordExpired when password is expired', async () => {
      const hashed = await bcrypt.hash('correct-pass', 4);
      const user = makeUser({ password: hashed });
      mockCheckPasswordExpiration.mockResolvedValue({ expired: true, expiringSoon: false });
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[user], []]);
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);
      const result = await login('user@test.com', 'correct-pass', mockReq);
      expect(result.passwordExpired).toBe(true);
      expect(result.tempToken).toBeDefined();
    });

    it('should require MFA when enabled', async () => {
      const hashed = await bcrypt.hash('correct-pass', 4);
      const user = makeUser({ password: hashed, mfa_enabled: 1 });
      mockCheckPasswordExpiration.mockResolvedValue({ expired: false, expiringSoon: false });
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[user], []]);
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);
      const result = await login('user@test.com', 'correct-pass', mockReq);
      expect(result.mfaRequired).toBe(true);
      expect(result.tempToken).toBeDefined();
    });

    it('should return tokens on successful login', async () => {
      const hashed = await bcrypt.hash('correct-pass', 4);
      const user = makeUser({ password: hashed });
      (mockPool.execute as jest.Mock).mockResolvedValueOnce([[user], []]);
      (mockPool.execute as jest.Mock).mockResolvedValue([[], []]);
      const result = await login('user@test.com', 'correct-pass', mockReq);
      expect(result.accessToken).toBe('at');
      expect(result.refreshToken).toBe('rt');
    });
  });

  describe('generatePasswordChangeToken', () => {
    it('should return a valid short-lived JWT', () => {
      const token = generatePasswordChangeToken('user-1', 'user@test.com');
      const decoded = jwt.decode(token) as any;
      expect(decoded.userId).toBe('user-1');
      expect(decoded.email).toBe('user@test.com');
      expect(decoded.type).toBe('password_change_temp');
    });
  });
});
