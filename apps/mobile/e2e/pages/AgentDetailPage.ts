import { by, element, expect } from 'detox';
import { BasePage } from './BasePage';

/**
 * Agent Detail Page Object
 * Handles agent detail screen interactions
 */
export class AgentDetailPage extends BasePage {
  // Element testIDs
  private readonly agentNameTestID = 'agent-name';
  private readonly editButtonTestID = 'edit-button';
  private readonly deleteButtonTestID = 'delete-button';
  private readonly agentDescriptionTestID = 'agent-description';
  private readonly agentAvatarTestID = 'agent-avatar';
  private readonly chatWithAgentTestID = 'chat-with-agent';
  private readonly matchButtonTestID = 'match-button';
  private readonly backButtonTestID = 'back-button';
  private readonly agentAttributesTestID = 'agent-attributes';
  private readonly agentStatusTestID = 'agent-status';

  /**
   * Navigate back from agent detail
   */
  async goBack(): Promise<void> {
    await this.tap(this.backButtonTestID);
  }

  /**
   * Tap edit button
   */
  async tapEdit(): Promise<void> {
    await this.tap(this.editButtonTestID);
  }

  /**
   * Tap delete button
   */
  async tapDelete(): Promise<void> {
    await this.tap(this.deleteButtonTestID);
  }

  /**
   * Tap chat with agent
   */
  async tapChat(): Promise<void> {
    await this.tap(this.chatWithAgentTestID);
  }

  /**
   * Tap match button
   */
  async tapMatch(): Promise<void> {
    await this.tap(this.matchButtonTestID);
  }

  /**
   * Assert agent detail page loaded
   */
  async assertAgentDetailLoaded(): Promise<void> {
    await this.waitForVisible(this.agentNameTestID, 5000);
    await this.assertElementVisible(this.agentAvatarTestID);
  }

  /**
   * Assert agent name displayed
   */
  async assertAgentName(name: string): Promise<void> {
    await this.assertElementHasText(this.agentNameTestID, name);
  }

  /**
   * Assert edit button visible
   */
  async assertEditButtonVisible(): Promise<void> {
    await this.assertElementVisible(this.editButtonTestID);
  }

  /**
   * Assert match button visible and enabled
   */
  async assertMatchButtonVisible(): Promise<void> {
    await this.assertElementVisible(this.matchButtonTestID);
  }

  /**
   * Assert chat button visible
   */
  async assertChatButtonVisible(): Promise<void> {
    await this.assertElementVisible(this.chatWithAgentTestID);
  }

  /**
   * Get agent name
   */
  async getAgentName(): Promise<string> {
    return await this.getElementText(this.agentNameTestID);
  }

  /**
   * Get agent description
   */
  async getAgentDescription(): Promise<string> {
    return await this.getElementText(this.agentDescriptionTestID);
  }

  /**
   * Assert agent is active
   */
  async assertAgentActive(): Promise<void> {
    const attrs = await element(by.id(this.agentStatusTestID)).getAttributes();
    expect(attrs.text).toBe('Active');
  }

  /**
   * Scroll to attributes section
   */
  async scrollToAttributes(): Promise<void> {
    await this.waitForVisible(this.agentAttributesTestID);
  }

  /**
   * Assert on agent detail page
   */
  async assertOnAgentDetailPage(): Promise<void> {
    await this.assertElementVisible(this.agentNameTestID);
    await this.assertElementVisible(this.agentAvatarTestID);
  }
}
