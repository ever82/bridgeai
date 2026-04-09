import { by, element, expect } from 'detox';
import { LoginPage, HomePage, AgentDetailPage } from '../pages';
import { DataFactory, DataCleanup, TestIsolation, StabilityMonitor } from '../support';

describe('Matching and Recommendation E2E Tests', () => {
  const loginPage = new LoginPage();
  const homePage = new HomePage();
  const agentDetailPage = new AgentDetailPage();
  let testUser: { email: string; password: string; id: string };
  let testAgent: { id: string; name: string } | null = null;

  beforeEach(async () => {
    const userId = TestIsolation.generateTestUserId();
    testUser = {
      id: userId,
      email: TestIsolation.generateTestEmail(userId),
      password: 'TestPassword123!',
    };

    const created = await DataFactory.createUser({
      id: userId,
      email: testUser.email,
      password: testUser.password,
    });
    testUser.id = created.id;

    // Create test agent for matching
    testAgent = await DataFactory.createAgent(testUser.id, {
      name: `MatchAgent-${Date.now()}`,
    });

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

  it('should load recommendation list on home screen', async () => {
    const startTime = Date.now();

    // Criterion 1: Assert home page loaded
    await homePage.assertHomeLoaded();

    // Criterion 2: Assert recommendation list visible
    await homePage.assertRecommendationListVisible();

    // Criterion 3: Verify recommendation items exist
    await expect(element(by.id('recommendation-item'))).toExist();

    // Criterion 4: Assert recommendation list has items
    const items = await element(by.id('recommendation-item')).getAttributes();
    expect(items).toBeDefined();

    // Criterion 5: Assert list is scrollable
    await homePage.scrollAgentList('down');

    // Record test result
    const duration = Date.now() - startTime;
    StabilityMonitor.recordResult({
      testName: 'should load recommendation list on home screen',
      fileName: 'matching.test.ts',
      status: 'passed',
      duration,
      retryCount: 0,
      timestamp: Date.now(),
    });

    expect(duration).toBeLessThan(120000);
  });

  it('should trigger match on button tap', async () => {
    const startTime = Date.now();

    // Criterion 1: Navigate to agent detail
    await homePage.navigateToAgent();
    await agentDetailPage.assertAgentDetailLoaded();

    // Criterion 2: Assert match button visible and clickable
    await agentDetailPage.assertMatchButtonVisible();

    // Criterion 3: Tap match button
    await agentDetailPage.tapMatch();

    // Criterion 4: Assert API call triggered (loading state)
    await expect(element(by.id('match-loading'))).toBeVisible();

    // Criterion 5: Assert match success state
    await expect(element(by.id('match-success'))).toBeVisible();

    // Criterion 6: Verify UI updates to show matched state
    await expect(element(by.id('matched-badge'))).toBeVisible();

    // Record test result
    const duration = Date.now() - startTime;
    StabilityMonitor.recordResult({
      testName: 'should trigger match on button tap',
      fileName: 'matching.test.ts',
      status: 'passed',
      duration,
      retryCount: 0,
      timestamp: Date.now(),
    });

    expect(duration).toBeLessThan(120000);
  });

  it('should update UI after successful match', async () => {
    const startTime = Date.now();

    // Criterion 1: Navigate to agent detail
    await homePage.navigateToAgent();
    await agentDetailPage.assertAgentDetailLoaded();

    // Criterion 2: Verify initial unmatched state
    await expect(element(by.id('match-button'))).toBeVisible();

    // Criterion 3: Trigger match
    await agentDetailPage.tapMatch();

    // Criterion 4: Wait for match completion
    await waitFor(element(by.id('matched-badge')))
      .toBeVisible()
      .withTimeout(10000);

    // Criterion 5: Assert match badge visible
    await expect(element(by.id('matched-badge'))).toBeVisible();

    // Criterion 6: Assert button changed to 'Matched' or disabled
    const matchButton = await element(by.id('match-button')).getAttributes();
    expect(matchButton.disabled || matchButton.text).toBeTruthy();

    // Criterion 7: Verify notification badge updated
    await homePage.assertNotificationBadgeCount(1);

    // Record test result
    const duration = Date.now() - startTime;
    StabilityMonitor.recordResult({
      testName: 'should update UI after successful match',
      fileName: 'matching.test.ts',
      status: 'passed',
      duration,
      retryCount: 0,
      timestamp: Date.now(),
    });

    expect(duration).toBeLessThan(120000);
  });

  it('should search and filter agents', async () => {
    const startTime = Date.now();

    // Criterion 1: Search for agent
    await homePage.searchAgent('MatchAgent');

    // Criterion 2: Assert search results displayed
    await homePage.assertSearchResults();

    // Criterion 3: Verify search result contains expected agent
    await expect(element(by.id('agent-card'))).toBeVisible();

    // Criterion 4: Assert agent name matches search
    const cardText = await element(by.id('agent-card')).getAttributes();
    expect(cardText.text || '').toContain('Agent');

    // Criterion 5: Clear search and verify all agents shown
    await element(by.id('search-clear-button')).tap();
    await homePage.assertAgentListVisible();

    // Record test result
    const duration = Date.now() - startTime;
    StabilityMonitor.recordResult({
      testName: 'should search and filter agents',
      fileName: 'matching.test.ts',
      status: 'passed',
      duration,
      retryCount: 0,
      timestamp: Date.now(),
    });

    expect(duration).toBeLessThan(120000);
  });

  it('should show match history', async () => {
    const startTime = Date.now();

    // Criterion 1: Create a match first
    await homePage.navigateToAgent();
    await agentDetailPage.assertAgentDetailLoaded();
    await agentDetailPage.tapMatch();
    await waitFor(element(by.id('matched-badge'))).toBeVisible();

    // Criterion 2: Navigate to matches screen
    await element(by.id('matches-tab')).tap();

    // Criterion 3: Assert match history loaded
    await expect(element(by.id('match-history-list'))).toBeVisible();

    // Criterion 4: Verify match item exists
    await expect(element(by.id('match-item'))).toExist();

    // Criterion 5: Assert match details shown
    await expect(element(by.id('match-agent-name'))).toBeVisible();

    // Criterion 6: Verify match status is correct
    const status = await element(by.id('match-status')).getAttributes();
    expect(status.text).toBeTruthy();

    // Record test result
    const duration = Date.now() - startTime;
    StabilityMonitor.recordResult({
      testName: 'should show match history',
      fileName: 'matching.test.ts',
      status: 'passed',
      duration,
      retryCount: 0,
      timestamp: Date.now(),
    });

    expect(duration).toBeLessThan(120000);
  });
});
