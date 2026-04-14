/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/tests/**/*.test.ts',
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      transpileOnly: true,
    }],
  },

  // Module path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@visionshare/shared$': '<rootDir>/src/__mocks__/@visionshare/shared.ts',
  },

  // Setup files
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
  
  globalTeardown: '<rootDir>/src/__tests__/teardown.ts',

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/index.ts',
    '!src/server.ts',
  ],

  // Coverage thresholds (80% as recommended)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json-summary',
  ],

  // Coverage output directory
  coverageDirectory: '<rootDir>/coverage',

  // Test timeout
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Clear mock calls between tests
  clearMocks: true,

  // Restore mock state between tests
  restoreMocks: true,

  // Fail tests on console errors/warnings (optional, can be disabled)
  // errorOnDeprecated: true,

  // Detect open handles (useful for async issues)
  detectOpenHandles: true,

  // Force exit after all tests complete
  forceExit: true,
};
