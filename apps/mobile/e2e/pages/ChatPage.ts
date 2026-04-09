import { by, element, expect } from 'detox';
import { BasePage } from './BasePage';

/**
 * Chat Page Object
 * Handles chat screen interactions
 */
export class ChatPage extends BasePage {
  // Element testIDs
  private readonly chatInputTestID = 'chat-input';
  private readonly sendButtonTestID = 'send-button';
  private readonly messageListTestID = 'message-list';
  private readonly messageSentTestID = 'message-sent';
  private readonly messageReceivedTestID = 'message-received';
  private readonly chatHeaderTestID = 'chat-header';
  private readonly backButtonTestID = 'back-button';
  private readonly unreadBadgeTestID = 'unread-badge';
  private readonly typingIndicatorTestID = 'typing-indicator';

  /**
   * Navigate to chat page
   */
  async navigateToChat(): Promise<void> {
    await this.tap(this.chatHeaderTestID);
  }

  /**
   * Type message in chat input
   */
  async typeMessage(text: string): Promise<void> {
    await this.waitForVisible(this.chatInputTestID);
    await this.typeText(this.chatInputTestID, text);
  }

  /**
   * Send message
   */
  async sendMessage(text: string): Promise<void> {
    await this.typeMessage(text);
    await this.tap(this.sendButtonTestID);
  }

  /**
   * Tap send button
   */
  async tapSend(): Promise<void> {
    await this.tap(this.sendButtonTestID);
  }

  /**
   * Go back from chat
   */
  async goBack(): Promise<void> {
    await this.tap(this.backButtonTestID);
  }

  /**
   * Assert message sent successfully
   */
  async assertMessageSent(text: string): Promise<void> {
    await this.waitForVisible(this.messageSentTestID, 5000);
    const messages = await element(by.text(text)).getAttributes();
    expect(messages).toBeDefined();
  }

  /**
   * Assert message received
   */
  async assertMessageReceived(text: string): Promise<void> {
    await this.waitForVisible(this.messageReceivedTestID, 10000);
    const message = element(by.text(text));
    await expect(message).toExist();
  }

  /**
   * Assert chat page loaded
   */
  async assertChatLoaded(): Promise<void> {
    await this.assertElementVisible(this.chatInputTestID);
    await this.assertElementVisible(this.sendButtonTestID);
    await this.assertElementVisible(this.messageListTestID);
  }

  /**
   * Assert unread badge shows count
   */
  async assertUnreadBadgeCount(expectedCount: number): Promise<void> {
    await this.waitForVisible(this.unreadBadgeTestID, 5000);
    const attrs = await element(by.id(this.unreadBadgeTestID)).getAttributes();
    expect(attrs.text).toBe(String(expectedCount));
  }

  /**
   * Assert typing indicator visible
   */
  async assertTypingIndicator(): Promise<void> {
    await this.assertElementVisible(this.typingIndicatorTestID);
  }

  /**
   * Scroll to message
   */
  async scrollToMessage(messageText: string): Promise<void> {
    await this.scrollTo(messageText, this.messageListTestID, 'up');
  }

  /**
   * Get last message text
   */
  async getLastMessage(): Promise<string> {
    const messages = await element(by.id(this.messageSentTestID)).getAttributes();
    if (Array.isArray(messages.elements) && messages.elements.length > 0) {
      return messages.elements[messages.elements.length - 1].text || '';
    }
    return messages.text || '';
  }

  /**
   * Clear chat input
   */
  async clearChatInput(): Promise<void> {
    await this.clearText(this.chatInputTestID);
  }

  /**
   * Long press on message (for options)
   */
  async longPressMessage(messageText: string): Promise<void> {
    await element(by.text(messageText)).longPress();
  }

  /**
   * Wait for message to appear
   */
  async waitForMessage(text: string, timeout?: number): Promise<void> {
    await waitFor(element(by.text(text)))
      .toExist()
      .withTimeout(timeout || 10000);
  }
}
