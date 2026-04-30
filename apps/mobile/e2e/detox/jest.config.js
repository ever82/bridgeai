/** @type {import('@jest/types').Config.ProjectConfig} */
module.exports = {
  rootDir: '../..',
  testMatch: ['<rootDir>/e2e/detox/**/*.test.ts'],
  testTimeout: 120000,
  setupFilesAfterSetup: ['./setup.ts'],
  globalSetup: './globalSetup.ts',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
