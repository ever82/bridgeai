"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
/**
 * Playwright configuration for BridgeAI Mobile Web E2E tests
 *
 * Prerequisites:
 *   1. npm run web  (Expo web dev server on localhost:8081)
 *   2. npx playwright install
 *
 * Run:
 *   npx playwright test
 */
exports.default = (0, test_1.defineConfig)({
    testDir: './',
    testMatch: '*.spec.ts',
    // Run tests in files in parallel
    fullyParallel: true,
    // Fail the build on CI if you accidentally left test.only in the source code
    forbidOnly: !!process.env.CI,
    // Retry on CI only
    retries: process.env.CI ? 2 : 0,
    // Opt out of parallel tests on CI
    workers: process.env.CI ? 1 : undefined,
    // Reporter to use
    reporter: 'html',
    // Shared settings for all the projects below
    use: {
        // Base URL to use in actions like `await page.goto('/')`
        baseURL: 'http://localhost:8081',
        // Collect trace when retrying the failed test
        trace: 'on-first-retry',
        // Screenshot on failure
        screenshot: 'only-on-failure',
    },
    // Configure projects for major browsers
    projects: [
        {
            name: 'chromium-mobile',
            use: {
                ...test_1.devices['iPhone 14'],
                browserName: 'chromium',
            },
        },
        {
            name: 'webkit-mobile',
            use: {
                ...test_1.devices['iPhone 14'],
                browserName: 'webkit',
            },
        },
    ],
    // Run local dev server before starting the tests
    webServer: {
        command: 'cd .. && npm run web',
        url: 'http://localhost:8081',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});
//# sourceMappingURL=playwright.config.js.map