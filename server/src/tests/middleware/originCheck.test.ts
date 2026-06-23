import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockResolveCorsDecision = jest.fn();

jest.mock('../../middleware/corsPolicy.js', () => ({
  resolveCorsDecision: (...args: any[]) => mockResolveCorsDecision(...args),
}));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

const { originCheck } = require('../../middleware/originCheck.js');

describe('originCheck middleware', () => {
  let req: any;
  let res: any;
  let next: ReturnType<typeof jest.fn>;

  beforeEach(() => {
    req = {
      method: 'POST',
      originalUrl: '/api/assets',
      ip: '192.168.1.1',
      get: jest.fn(),
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should pass through for safe methods (GET, HEAD, OPTIONS)', () => {
    req.method = 'GET';
    originCheck(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should pass through for exempt paths (e.g. /api/auth/refresh)', () => {
    req.originalUrl = '/api/auth/refresh';
    originCheck(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should reject missing Origin and Referer from non-loopback ip', () => {
    req.get.mockReturnValue(undefined);
    originCheck(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'CSRF: missing Origin/Referer' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow missing Origin/Referer from loopback ip', () => {
    req.ip = '127.0.0.1';
    req.get.mockReturnValue(undefined);
    originCheck(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should reject origin that fails cors decision', () => {
    req.get.mockImplementation((h: string) =>
      h === 'Origin' ? 'http://evil.com' : undefined
    );
    mockResolveCorsDecision.mockReturnValue({ allowed: false, reason: 'not_in_allowlist' });
    originCheck(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'CSRF: bad Origin/Referer' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow origin that passes cors decision', () => {
    req.get.mockImplementation((h: string) =>
      h === 'Origin' ? 'https://trusted.com' : undefined
    );
    mockResolveCorsDecision.mockReturnValue({ allowed: true, reason: 'exact_allowlist' });
    originCheck(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should use Referer when Origin is not present', () => {
    req.get.mockImplementation((h: string) =>
      h === 'Referer' ? 'https://trusted.com/some-page' : undefined
    );
    mockResolveCorsDecision.mockReturnValue({ allowed: true, reason: 'exact_allowlist' });
    originCheck(req, res, next);
    expect(mockResolveCorsDecision).toHaveBeenCalledWith('https://trusted.com/some-page');
    expect(next).toHaveBeenCalled();
  });
});
