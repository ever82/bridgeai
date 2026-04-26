module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Exclude test directories that reference missing source files
  testPathIgnorePatterns: ['/node_modules/', 'src/protocols/__tests__/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/**/__tests__/**'],
  moduleNameMapper: {
    '^\\./index$': '<rootDir>/src/config/scenes/index.js',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        isolatedModules: true,
        diagnostics: { ignoreCodes: [151002] },
      },
    ],
  },
};
