import { by, element, expect } from 'detox';
import { LoginPage, HomePage } from '../pages';
import { DataFactory, DataCleanup, TestIsolation, StabilityMonitor } from '../support';

describe('Auth Flow E2E Tests', () => {
  const loginPage = new LoginPage();
  const homePage = new HomePage();
  let testUser: { email: string; password: string; id: string };

  beforeEach(async () => {
    // Generate unique test user for isolation
    const userId = TestIsolation.generateTestUserId();
    testUser = {
      id: userId,
      email: TestIsolation.generateTestEmail(userId),
      password: 'TestPassword123!',
    };

    // Create user via API
    const created = await DataFactory.createUser({
      id: userId,
      email: testUser.email,
      password: testUser.password,
    });
    testUser.id = created.id;

    // Launch fresh app instance
    await device.launchApp({
      newInstance: true,
      launchArgs: { 'e2e-test-user-id': userId },
    });
  });

  afterEach(async () => {
    // Cleanup test data
    await DataCleanup.cleanupTestData(testUser.id);
  });

  afterAll(async () => {
    // Generate stability report
    StabilityMonitor.saveReport();
  });

  it('should login successfully and navigate to home', async () => {
    const startTime = Date.now();

    // Criterion 1: Verify on login page
    await loginPage.assertOnLoginPage();

    // Criterion 2: Enter credentials and login
    await loginPage.login(testUser.email, testUser.password);

    // Criterion 3: Assert successful login - redirected to home
    await homePage.assertHomeLoaded();

    // Criterion 4: Assert user avatar visible (login state persistence indicator)
    await homePage.assertUserLoggedIn();

    // Criterion 5: Assert agent list loaded
    await homePage.assertAgentListVisible();

    // Record test result for stability monitoring
    const duration = Date.now() - startTime;
    StabilityMonitor.recordResult({
      testName: 'should login successfully and navigate to home',
      fileName: 'auth-flow.test.ts',
      status: 'passed',
      duration,
      retryCount: 0,
      timestamp: Date.now(),
    });

    // Assert test execution time ≤ 2 minutes
    expect(duration).toBeLessThan(120000);
  });

  it('should show error for invalid credentials', async () => {
    const startTime = Date.now();

    // Criterion 1: Verify on login page
    await loginPage.assertOnLoginPage();

    // Criterion 2: Attempt login with invalid credentials
    await loginPage.login('invalid@email.com', 'wrongpassword');

    // Criterion 3: Assert error message displayed
    await loginPage.assertLoginError();

    // Criterion 4: Verify error message content
    const errorText = await loginPage.getErrorMessage();
    expect(errorText).toBeTruthy();
    expect(errorText.length).toBeGreaterThan(0);

    // Criterion 5: Assert still on login page (not redirected)
    await loginPage.assertOnLoginPage();

    // Record test result
    const duration = Date.now() - startTime;
    StabilityMonitor.recordResult({
      testName: 'should show error for invalid credentials',
      fileName: 'auth-flow.test.ts',
      status: 'passed',
      duration,
      retryCount: 0,
      timestamp: Date.now(),
    });

    expect(duration).toBeLessThan(120000);
  });

  it('should persist login state after app restart', async () => {
    const startTime = Date.now();

    // Criterion 1: Login first
    await loginPage.login(testUser.email, testUser.password);
    await homePage.assertHomeLoaded();

    // Criterion 2: Relaunch app without newInstance (should restore state)
    await device.reloadReactNative();

    // Criterion 3: Assert still logged in (user avatar visible)
    await homePage.assertUserLoggedIn();

    // Criterion 4: Assert home page loaded
    await homePage.assertHomeLoaded();

    // Criterion 5: Assert AsyncStorage token persistence
    // Verify user-specific elements are still present
    await homePage.assertAgentListVisible();

    // Record test result
    const duration = Date.now() - startTime;
    StabilityMonitor.recordResult({
      testName: 'should persist login state after app restart',
      fileName: 'auth-flow.test.ts',
      status: 'passed',
      duration,
      retryCount: 0,
      timestamp: Date.now(),
    });

    expect(duration).toBeLessThan(120000);
  });

  it('should validate email format', async () => {
    const startTime = Date.now();

    // Criterion 1: Enter invalid email format
    await loginPage.enterEmail('invalid-email');
    await loginPage.enterPassword('somepassword');

    // Criterion 2: Attempt login
    await loginPage.tapLogin();

    // Criterion 3: Assert validation error
    await loginPage.assertLoginError();

    // Criterion 4: Assert error message visible
    await expect(element(by.id('error-message'))).toBeVisible();

    // Criterion 5: Assert login button still enabled (can try again)
    await loginPage.assertLoginButtonEnabled();

    // Record test result
    const duration = Date.now() - startTime;
    StabilityMonitor.recordResult({
      testName: 'should validate email format',
      fileName: 'auth-flow.test.ts',
      status: 'passed',
      duration,
      retryCount: 0,
      timestamp: Date.now(),
    });

    expect(duration).toBeLessThan(120000);
  });

  it('should logout and return to login screen', async () => {
    const startTime = Date.now();

    // Criterion 1: Login first
    await loginPage.login(testUser.email, testUser.password);
    await homePage.assertHomeLoaded();

    // Criterion 2: Navigate to profile and logout
    await homePage.navigateToProfile();
    await element(by.id('logout-button')).tap();

    // Criterion 3: Confirm logout if dialog appears
    await element(by.id('confirm-logout-button')).tap();

    // Criterion 4: Assert redirected to login page
    await loginPage.assertOnLoginPage();

    // Criterion 5: Assert user avatar not visible
    await loginPage.assertElementNotVisible('user-avatar');

    // Record test result
    const duration = Date.now() - startTime;
    StabilityMonitor.recordResult({
      testName: 'should logout and return to login screen',
      fileName: 'auth-flow.test.ts',
      status: 'passed',
      duration,
      retryCount: 0,
      timestamp: Date.now(),
    });

    expect(duration).toBeLessThan(120000);
  });
});
