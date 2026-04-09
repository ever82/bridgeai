import { by, element, expect } from 'detox';
import { BasePage } from './BasePage';

/**
 * Home Page Object
 * Handles home screen interactions
 */
export class HomePage extends BasePage {
  // Element testIDs
  private readonly homeTabTestID = 'home-tab';
  private readonly agentListTestID = 'agent-list';
  private readonly userAvatarTestID = 'user-avatar';
  private readonly notificationBadgeTestID = 'notification-badge';
  private readonly searchInputTestID = 'search-input';
  private readonly recommendationListTestID = 'recommendation-list';
  private readonly agentCardTestID = 'agent-card';
  private readonly chatTabTestID = 'chat-tab';
  private readonly profileTabTestID = 'profile-tab';

  /**
   * Navigate to home tab
   */
  async navigateToHome(): Promise<void> {
    await this.tap(this.homeTabTestID);
  }

  /**
   * Assert home page is loaded
   */
  async assertHomeLoaded(): Promise<void> {
    await this.waitForVisible(this.agentListTestID, 10000);
    await this.assertElementVisible(this.userAvatarTestID);
  }

  /**
   * Navigate to agent detail by tapping agent card
   */
  async navigateToAgent(index: number = 0): Promise<void> {
    await this.waitForVisible(this.agentListTestID);
    // Tap the first agent card
    const agentCard = element(by.id(this.agentCardTestID)).atIndex(index);
    await agentCard.tap();
  }

  /**
   * Search for agent
   */
  async searchAgent(query: string): Promise<void> {
    await this.waitForVisible(this.searchInputTestID);
    await this.typeText(this.searchInputTestID, query);
    // Trigger search (usually by pressing enter or waiting for debounce)
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Navigate to chat tab
   */
  async navigateToChat(): Promise<void> {
    await this.tap(this.chatTabTestID);
  }

  /**
   * Navigate to profile tab
   */
  async navigateToProfile(): Promise<void> {
    await this.tap(this.profileTabTestID);
  }

  /**
   * Assert agent list is visible
   */
  async assertAgentListVisible(): Promise<void> {
    await this.assertElementVisible(this.agentListTestID);
  }

  /**
   * Assert recommendation list is visible
   */
  async assertRecommendationListVisible(): Promise<void> {
    await this.assertElementVisible(this.recommendationListTestID);
  }

  /**
   * Assert notification badge shows count
   */
  async assertNotificationBadgeCount(expectedCount: number): Promise<void> {
    await this.waitForVisible(this.notificationBadgeTestID, 5000);
    const attrs = await element(by.id(this.notificationBadgeTestID)).getAttributes();
    expect(attrs.text).toBe(String(expectedCount));
  }

  /**
   * Assert user avatar is visible (login state)
   */
  async assertUserLoggedIn(): Promise<void> {
    await this.assertElementVisible(this.userAvatarTestID);
  }

  /**
   * Get agent count in list
   */
  async getAgentCount(): Promise<number> {
    const agentCards = await element(by.id(this.agentCardTestID)).getAttributes();
    if (Array.isArray(agentCards.elements)) {
      return agentCards.elements.length;
    }
    return 1; // Single element
  }

  /**
   * Scroll agent list
   */
  async scrollAgentList(direction: 'up' | 'down'): Promise<void> {
    await this.swipe(this.agentListTestID, direction);
  }

  /**
   * Assert search results displayed
   */
  async assertSearchResults(): Promise<void> {
    await this.waitForVisible(this.agentCardTestID, 5000);
  }

  /**
   * Tap on specific agent by name
   */
  async tapAgentByName(name: string): Promise<void> {
    // Use accessibilityLabel if set, otherwise we'd need text matcher
    await element(by.label(`Agent: ${name}`)).tap();
  }
}
