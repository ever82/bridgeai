/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/tests/**/*.test.ts'],
  testTimeout: 120000, // 2 minutes per test
  maxWorkers: process.env.CI ? 3 : 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './e2e/reports',
      outputName: 'junit-e2e.xml',
    }],
    ['jest-html-reporters', {
      publicPath: './e2e/reports/html',
      filename: 'e2e-report.html',
      expand: true,
    }],
  ],
  verbose: true,
  bail: 0,
  retryTimes: 2, // Auto-retry failed tests 2 times
};
