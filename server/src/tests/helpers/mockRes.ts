import { Response } from 'express';
import { jest } from '@jest/globals';

/**
 * Creates a mock Express response for controller tests.
 * res.status().json() is chainable; captures status and json payload.
 */
export function createMockRes(): Response & {
  _status: number;
  _json: unknown;
  status: jest.Mock;
  json: jest.Mock;
} {
  const res: any = {
    _status: 0,
    _json: undefined as unknown,
    status: jest.fn(),
    json: jest.fn(),
    setHeader: jest.fn(),
    send: jest.fn(),
    end: jest.fn(),
  };
  res.status.mockImplementation((code: number) => {
    res._status = code;
    return res;
  });
  res.json.mockImplementation((body: unknown) => {
    res._json = body;
    return res;
  });
  return res as Response & {
    _status: number;
    _json: unknown;
    status: jest.Mock;
    json: jest.Mock;
  };
}
