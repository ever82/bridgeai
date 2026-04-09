/** @type {import('jest').Config} */
module.exports = {
  displayName: 'mobile',
  rootDir: '.',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { configFile: './babel.config.test.js' }],
  },
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@visionshare/shared$': '<rootDir>/../../packages/shared/src',
    '^react-native$': '<rootDir>/__mocks__/react-native.ts',
    '^expo-(.*)$': '<rootDir>/__mocks__/expo-$1.ts',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/@react-native-async-storage/async-storage.ts',
    '^@react-navigation/native$': '<rootDir>/__mocks__/@react-navigation/native.ts',
    '^react-native-maps$': '<rootDir>/__mocks__/react-native-maps.ts',
    '^react-native-gesture-handler$': '<rootDir>/__mocks__/react-native-gesture-handler.ts',
    '^react-native-reanimated$': '<rootDir>/__mocks__/react-native-reanimated.ts',
    '^react-native-safe-area-context$': '<rootDir>/__mocks__/react-native-safe-area-context.ts',
    '^react-native-screens$': '<rootDir>/__mocks__/react-native-screens.ts',
    '^nativewind$': '<rootDir>/__mocks__/nativewind.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!react-native)',
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/**/__tests__/**/*.test.tsx',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  clearMocks: true,
  restoreMocks: true,
};
