/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: false,
        tsconfig: {
          jsx: 'react-jsx',
          module: 'commonjs',
          moduleResolution: 'node',
        },
      },
    ],
  },
  moduleNameMapper: {
    '\\.(png|jpg|jpeg|gif|svg|webp)$':
      '<rootDir>/src/__tests__/__mocks__/fileMock.js',
    '^@/lib/env$': '<rootDir>/src/__tests__/__mocks__/env.ts',
    '^@/lib/logger$': '<rootDir>/src/__tests__/__mocks__/logger.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  modulePathIgnorePatterns: ['<rootDir>/dist'],
};
