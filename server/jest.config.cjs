/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/tests/**/*.test.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    'integration\\.test\\.ts$',
    'repository\\.test\\.ts$',
  ],
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // The real Vonage SDK pulls in `node-fetch@3` (ESM only) which trips
    // Jest's default transformIgnorePatterns. Replace it with a stub for
    // unit tests — integration tests can override via jest.unmock if needed.
    '^uuid$': '<rootDir>/src/tests/__mocks__/uuid.cjs',
    '^@vonage/server-sdk$': '<rootDir>/src/tests/__mocks__/vonage.cjs',
  },
};
