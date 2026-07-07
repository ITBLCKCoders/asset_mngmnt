import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockFileTypeFromBuffer = jest.fn();

jest.mock('file-type', () => ({
  fileTypeFromBuffer: (...args: any[]) => mockFileTypeFromBuffer(...args),
}));
jest.mock('../../logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

const { verifyFileMagicBytes } = require('../../middleware/verifyFileMagicBytes.js');

describe('verifyFileMagicBytes middleware', () => {
  let req: any;
  let res: any;
  let next: ReturnType<typeof jest.fn>;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should call next when no files present', async () => {
    const middleware = verifyFileMagicBytes('image');
    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should call next when file passes magic byte check', async () => {
    req.file = { buffer: Buffer.from('fake-png'), mimetype: 'image/png', originalname: 'test.png' };
    mockFileTypeFromBuffer.mockResolvedValue({ mime: 'image/png' });
    const middleware = verifyFileMagicBytes('image');
    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should reject file when magic bytes cannot be detected', async () => {
    req.file = { buffer: Buffer.from('garbage'), mimetype: 'image/png', originalname: 'bad.png' };
    mockFileTypeFromBuffer.mockResolvedValue(null);
    const middleware = verifyFileMagicBytes('image');
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Unsupported or corrupted file' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject file when detected MIME is not allowed', async () => {
    req.file = { buffer: Buffer.from('fake-gif'), mimetype: 'image/gif', originalname: 'test.gif' };
    mockFileTypeFromBuffer.mockResolvedValue({ mime: 'image/gif' });
    const middleware = verifyFileMagicBytes('pdf');
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'File type not allowed' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject file when declared MIME does not match detected', async () => {
    req.file = { buffer: Buffer.from('fake-png'), mimetype: 'image/gif', originalname: 'test.png' };
    mockFileTypeFromBuffer.mockResolvedValue({ mime: 'image/png' });
    const middleware = verifyFileMagicBytes('image');
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'File contents do not match declared type' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle imageOrPdf category allowing both types', async () => {
    req.file = { buffer: Buffer.from('fake-pdf'), mimetype: 'application/pdf', originalname: 'doc.pdf' };
    mockFileTypeFromBuffer.mockResolvedValue({ mime: 'application/pdf' });
    const middleware = verifyFileMagicBytes('imageOrPdf');
    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should return 500 for unknown category', async () => {
    const middleware = verifyFileMagicBytes('video' as any);
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle req.files as array', async () => {
    req.files = [
      { buffer: Buffer.from('fake-png'), mimetype: 'image/png', originalname: 'a.png' },
      { buffer: Buffer.from('fake-jpg'), mimetype: 'image/jpeg', originalname: 'b.jpg' },
    ];
    mockFileTypeFromBuffer.mockResolvedValue({ mime: 'image/png' });
    const middleware = verifyFileMagicBytes('image');
    await middleware(req, res, next);
    expect(mockFileTypeFromBuffer).toHaveBeenCalledTimes(2);
  });

  it('should tolerate jpg/jpeg MIME aliases', async () => {
    req.file = { buffer: Buffer.from('fake-jpg'), mimetype: 'image/jpg', originalname: 'test.jpg' };
    mockFileTypeFromBuffer.mockResolvedValue({ mime: 'image/jpeg' });
    const middleware = verifyFileMagicBytes('image');
    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
