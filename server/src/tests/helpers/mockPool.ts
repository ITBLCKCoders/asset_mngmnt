import { jest } from '@jest/globals';

export type MockPool = {
  query: ReturnType<typeof jest.fn>;
  execute: ReturnType<typeof jest.fn>;
};

/**
 * Creates a mock MySQL pool for unit tests.
 * query and execute return [rows, fields] by default; override with mockResolvedValue.
 */
export function createMockPool(
  defaultQueryResult: [unknown[], unknown[]] = [[], []],
  defaultExecuteResult: [unknown[], unknown[]] = [[], []]
): MockPool {
  return {
    query: jest
      .fn<() => Promise<[unknown[], unknown[]]>>()
      .mockResolvedValue(defaultQueryResult),
    execute: jest
      .fn<() => Promise<[unknown[], unknown[]]>>()
      .mockResolvedValue(defaultExecuteResult),
  } as MockPool;
}
