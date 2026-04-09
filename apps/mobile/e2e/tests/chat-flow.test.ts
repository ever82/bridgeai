import { by, element, expect, waitFor } from 'detox';
import { LoginPage, HomePage, ChatPage, AgentDetailPage } from '../pages';
import { DataFactory, DataCleanup, TestIsolation, StabilityMonitor } from '../support';

describe('Chat Flow E2E Tests', () => {
  const loginPage = new LoginPage();
  const homePage = new HomePage();
  const chatPage = new ChatPage();
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

    testAgent = await DataFactory.createAgent(testUser.id, {
      name: `ChatAgent-${Date.now()}`,
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

  it('should send message and display in chat', async () => {
    const startTime = Date.now();
    const messageText = `Test message ${Date.now()}`;

    // Criterion 1: Navigate to chat
    await homePage.navigateToChat();
    await chatPage.assertChatLoaded();

    // Criterion 2: Type message
    await chatPage.typeMessage(messageText);

    // Criterion 3: Send message
    await chatPage.tapSend();

    // Criterion 4: Assert message sent indicator visible
    await chatPage.assertMessageSent(messageText);

    // Criterion 5: Assert message appears in list
    const messageElement = await element(by.text(messageText)).getAttributes();
    expect(messageElement).toBeDefined();

    // Criterion 6: Verify input cleared after send
    const inputAttrs = await element(by.id('chat-input')).getAttributes();
    expect(inputAttrs.text || '').toBe('');

    // Record test result
    const duration = Date.now() - startTime;
    StabilityMonitor.recordResult({
      testName: 'should send message and display in chat',
      fileName: 'chat-flow.test.ts',
      status: 'passed',
      duration,
      retryCount: 0,
      timestamp: Date.now(),
    });

    expect(duration).toBeLessThan(120000);
  });

  it('should receive and display messages', async () => {
    const startTime = Date.now();

    // Criterion 1: Navigate to chat
    await homePage.navigateToChat();
    await chatPage.assertChatLoaded();

    // Criterion 2: Wait for any existing messages to load
    await waitFor(element(by.id('message-list')))
      .toBeVisible()
      .withTimeout(5000);

    // Criterion 3: Trigger a mock incoming message via API
    // (This would typically involve backend API call)
    await element(by.id('test-receive-message')).tap();

    // Criterion 4: Assert received message displayed
    await chatPage.assertMessageReceived('Received test message');

    // Criterion 5: Verify message list updated
    const messageList = await element(by.id('message-list')).getAttributes();
    expect(messageList).toBeDefined();

    // Criterion 6: Assert message has received styling/indicator
    await expect(element(by.id('message-received'))).toBeVisible();

    // Record test result
    const duration = Date.now() - startTime;
    StabilityMonitor.recordResult({
      testName: 'should receive and display messages',
      fileName: 'chat-flow.test.ts',
      status: 'passed',
      duration,
      retryCount: 0,
      timestamp: Date.now(),
    });

    expect(duration).toBeLessThan(120000);
  });

  it('should update unread badge on new message', async () => {
    const startTime = Date.now();

    // Criterion 1: Go back to home (not in chat)
    await homePage.navigateToHome();

    // Criterion 2: Trigger message from another user/agent
    await element(by.id('test-trigger-notification')).tap();

    // Criterion 3: Assert unread badge shows count
    await chatPage.assertUnreadBadgeCount(1);

    // Criterion 4: Navigate to chat
    await homePage.navigateToChat();
    await chatPage.assertChatLoaded();

    // Criterion 5: Assert unread badge cleared after viewing
    await waitFor(element(by.id('unread-badge')))
      .not.toBeVisible()
      .withTimeout(3000);

    // Criterion 6: Verify chat shows new message
    await expect(element(by.id('message-received'))).toBeVisible();

    // Record test result
    const duration = Date.now() - startTime;
    StabilityMonitor.recordResult({
      testName: 'should update unread badge on new message',
      fileName: 'chat-flow.test.ts',
      status: 'passed',
      duration,
      retryCount: 0,
      timestamp: Date.now(),
    });

    expect(duration).toBeLessThan(120000);
  });

  it('should navigate to chat from agent detail', async () => {
    const startTime = Date.now();

    // Criterion 1: Navigate to agent detail
    await homePage.navigateToAgent();
    await agentDetailPage.assertAgentDetailLoaded();

    // Criterion 2: Assert chat button visible
    await agentDetailPage.assertChatButtonVisible();

    // Criterion 3: Tap chat with agent
    await agentDetailPage.tapChat();

    // Criterion 4: Assert navigated to chat
    await chatPage.assertChatLoaded();

    // Criterion 5: Verify chat header shows agent name
    const header = await element(by.id('chat-header')).getAttributes();
    expect(header.text || '').toContain(testAgent?.name || 'Agent');

    // Criterion 6: Assert input field ready for messaging
    await expect(element(by.id('chat-input'))).toBeVisible();

    // Record test result
    const duration = Date.now() - startTime;
    StabilityMonitor.recordResult({
      testName: 'should navigate to chat from agent detail',
      fileName: 'chat-flow.test.ts',
      status: 'passed',
      duration,
      retryCount: 0,
      timestamp: Date.now(),
    });

    expect(duration).toBeLessThan(120000);
  });

  it('should scroll chat history', async () => {
    const startTime = Date.now();

    // Criterion 1: Navigate to chat
    await homePage.navigateToChat();
    await chatPage.assertChatLoaded();

    // Criterion 2: Send multiple messages to create history
    for (let i = 0; i < 5; i++) {
      await chatPage.sendMessage(`Message ${i + 1}`);
    }

    // Criterion 3: Assert message list visible
    await expect(element(by.id('message-list'))).toBeVisible();

    // Criterion 4: Scroll up to see older messages
    await chatPage.scrollToMessage('Message 1');

    // Criterion 5: Assert older messages visible after scroll
    await expect(element(by.text('Message 1'))).toBeVisible();

    // Criterion 6: Scroll down to return to bottom
    await element(by.id('message-list')).swipe('up');

    // Criterion 7: Assert can see latest message
    await expect(element(by.text('Message 5'))).toBeVisible();

    // Record test result
    const duration = Date.now() - startTime;
    StabilityMonitor.recordResult({
      testName: 'should scroll chat history',
      fileName: 'chat-flow.test.ts',
      status: 'passed',
      duration,
      retryCount: 0,
      timestamp: Date.now(),
    });

    expect(duration).toBeLessThan(120000);
  });

  it('should show typing indicator', async () => {
    const startTime = Date.now();

    // Criterion 1: Navigate to chat
    await homePage.navigateToChat();
    await chatPage.assertChatLoaded();

    // Criterion 2: Trigger typing indicator via API
    await element(by.id('test-typing-indicator')).tap();

    // Criterion 3: Assert typing indicator visible
    await chatPage.assertTypingIndicator();

    // Criterion 4: Wait for indicator to disappear (after timeout)
    await waitFor(element(by.id('typing-indicator')))
      .not.toBeVisible()
      .withTimeout(5000);

    // Criterion 5: Verify indicator cleared
    await expect(element(by.id('typing-indicator'))).not.toExist();

    // Record test result
    const duration = Date.now() - startTime;
    StabilityMonitor.recordResult({
      testName: 'should show typing indicator',
      fileName: 'chat-flow.test.ts',
      status: 'passed',
      duration,
      retryCount: 0,
      timestamp: Date.now(),
    });

    expect(duration).toBeLessThan(120000);
  });
});
