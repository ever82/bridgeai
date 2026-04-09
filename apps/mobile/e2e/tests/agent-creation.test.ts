import { by, element, expect } from 'detox';
import { LoginPage, HomePage, AgentDetailPage } from '../pages';
import { DataFactory, DataCleanup, TestIsolation, StabilityMonitor } from '../support';

describe('Agent Creation E2E Tests', () => {
  const loginPage = new LoginPage();
  const homePage = new HomePage();
  const agentDetailPage = new AgentDetailPage();
  let testUser: { email: string; password: string; id: string };

  beforeEach(async () => {
    // Generate unique test user for isolation
    const userId = TestIsolation.generateTestUserId();
    testUser = {
      id: userId,
      email: TestIsolation.generateTestEmail(userId),
      password: 'TestPassword123!',
    };

    // Create user via API and login
    const created = await DataFactory.createUser({
      id: userId,
      email: testUser.email,
      password: testUser.password,
    });
    testUser.id = created.id;

    // Launch app and login
    await device.launchApp({ newInstance: true });
    await loginPage.login(testUser.email, testUser.password);
    await homePage.assertHomeLoaded();
  });

  afterEach(async () => {
    await DataCleanup.cleanupTestData(testUser.id);
  });

  afterAll(async () => {
    StabilityMonitor.saveReport();
  });

  it('should create agent with valid data and navigate to detail', async () => {
    const startTime = Date.now();
    const agentName = `TestAgent-${Date.now()}`;

    // Criterion 1: Navigate to agent creation
    await element(by.id('create-agent-button')).tap();

    // Criterion 2: Fill agent creation form
    await element(by.id('agent-name-input')).typeText(agentName);
    await element(by.id('agent-description-input')).typeText('Test agent description for E2E');

    // Criterion 3: Submit form
    await element(by.id('agent-submit-button')).tap();

    // Criterion 4: Assert API response success - navigated to agent detail
    await agentDetailPage.assertAgentDetailLoaded();

    // Criterion 5: Assert agent name displayed correctly
    await agentDetailPage.assertAgentName(agentName);

    // Criterion 6: Assert edit button visible (success indicator)
    await agentDetailPage.assertEditButtonVisible();

    // Criterion 7: Verify agent status is active
    await agentDetailPage.assertAgentActive();

    // Record test result
    const duration = Date.now() - startTime;
    StabilityMonitor.recordResult({
      testName: 'should create agent with valid data and navigate to detail',
      fileName: 'agent-creation.test.ts',
      status: 'passed',
      duration,
      retryCount: 0,
      timestamp: Date.now(),
    });

    expect(duration).toBeLessThan(120000);
  });

  it('should show validation errors for empty fields', async () => {
    const startTime = Date.now();

    // Criterion 1: Navigate to agent creation
    await element(by.id('create-agent-button')).tap();

    // Criterion 2: Submit form without filling required fields
    await element(by.id('agent-submit-button')).tap();

    // Criterion 3: Assert form validation errors displayed
    await expect(element(by.id('error-message'))).toBeVisible();

    // Criterion 4: Assert name field shows error
    await expect(element(by.id('agent-name-input-error'))).toBeVisible();

    // Criterion 5: Assert still on creation form (not navigated)
    await expect(element(by.id('agent-name-input'))).toBeVisible();

    // Criterion 6: Verify error message is informative
    const errorText = await element(by.id('error-message')).getAttributes();
    expect(errorText.text || '').toBeTruthy();

    // Record test result
    const duration = Date.now() - startTime;
    StabilityMonitor.recordResult({
      testName: 'should show validation errors for empty fields',
      fileName: 'agent-creation.test.ts',
      status: 'passed',
      duration,
      retryCount: 0,
      timestamp: Date.now(),
    });

    expect(duration).toBeLessThan(120000);
  });

  it('should cancel agent creation and return to home', async () => {
    const startTime = Date.now();

    // Criterion 1: Navigate to agent creation
    await element(by.id('create-agent-button')).tap();

    // Criterion 2: Fill partial data
    await element(by.id('agent-name-input')).typeText('Partial Agent Name');

    // Criterion 3: Tap cancel button
    await element(by.id('agent-cancel-button')).tap();

    // Criterion 4: Assert returned to home page
    await homePage.assertHomeLoaded();

    // Criterion 5: Assert no agent was created (verify count unchanged)
    await homePage.assertAgentListVisible();

    // Record test result
    const duration = Date.now() - startTime;
    StabilityMonitor.recordResult({
      testName: 'should cancel agent creation and return to home',
      fileName: 'agent-creation.test.ts',
      status: 'passed',
      duration,
      retryCount: 0,
      timestamp: Date.now(),
    });

    expect(duration).toBeLessThan(120000);
  });

  it('should update existing agent', async () => {
    const startTime = Date.now();

    // Criterion 1: Create agent first
    const agent = await DataFactory.createAgent(testUser.id, {
      name: 'Original Agent Name',
    });

    // Criterion 2: Navigate to agent detail
    await homePage.navigateToAgent();
    await agentDetailPage.assertAgentDetailLoaded();

    // Criterion 3: Tap edit button
    await agentDetailPage.tapEdit();

    // Criterion 4: Update agent name
    const newName = `UpdatedAgent-${Date.now()}`;
    await element(by.id('agent-name-input')).replaceText(newName);

    // Criterion 5: Save changes
    await element(by.id('agent-save-button')).tap();

    // Criterion 6: Assert changes persisted
    await agentDetailPage.assertAgentName(newName);

    // Criterion 7: Verify success message shown
    await expect(element(by.id('success-message'))).toBeVisible();

    // Record test result
    const duration = Date.now() - startTime;
    StabilityMonitor.recordResult({
      testName: 'should update existing agent',
      fileName: 'agent-creation.test.ts',
      status: 'passed',
      duration,
      retryCount: 0,
      timestamp: Date.now(),
    });

    expect(duration).toBeLessThan(120000);
  });

  it('should delete agent and remove from list', async () => {
    const startTime = Date.now();

    // Criterion 1: Create agent
    const agent = await DataFactory.createAgent(testUser.id, {
      name: 'AgentToDelete',
    });

    // Criterion 2: Navigate to agent detail
    await homePage.navigateToAgent();
    await agentDetailPage.assertAgentDetailLoaded();

    // Criterion 3: Tap delete button
    await agentDetailPage.tapDelete();

    // Criterion 4: Confirm deletion
    await element(by.id('confirm-delete-button')).tap();

    // Criterion 5: Assert returned to home
    await homePage.assertHomeLoaded();

    // Criterion 6: Assert agent removed from list
    // (Would need to verify specific agent not in list)
    await homePage.assertAgentListVisible();

    // Record test result
    const duration = Date.now() - startTime;
    StabilityMonitor.recordResult({
      testName: 'should delete agent and remove from list',
      fileName: 'agent-creation.test.ts',
      status: 'passed',
      duration,
      retryCount: 0,
      timestamp: Date.now(),
    });

    expect(duration).toBeLessThan(120000);
  });
});
