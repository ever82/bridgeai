import { by, element, waitFor, device } from 'detox';

/**
 * Base Page class for Page Object Model
 * Provides common methods for element interaction and waiting
 */
export abstract class BasePage {
  protected timeout = 10000; // 10 seconds default timeout
  protected pollInterval = 200; // 200ms polling interval

  /**
   * Wait for element to be visible
   */
  async waitForVisible(testID: string, timeout?: number): Promise<void> {
    const elem = element(by.id(testID));
    await waitFor(elem)
      .toBeVisible()
      .withTimeout(timeout || this.timeout);
  }

  /**
   * Wait for element to exist (not necessarily visible)
   */
  async waitForExist(testID: string, timeout?: number): Promise<void> {
    const elem = element(by.id(testID));
    await waitFor(elem)
      .toExist()
      .withTimeout(timeout || this.timeout);
  }

  /**
   * Wait for element to not exist
   */
  async waitForNotExist(testID: string, timeout?: number): Promise<void> {
    const elem = element(by.id(testID));
    await waitFor(elem)
      .not.toExist()
      .withTimeout(timeout || this.timeout);
  }

  /**
   * Tap element by testID
   */
  async tap(testID: string): Promise<void> {
    await this.waitForVisible(testID);
    await element(by.id(testID)).tap();
  }

  /**
   * Type text into element
   */
  async typeText(testID: string, text: string): Promise<void> {
    await this.waitForVisible(testID);
    await element(by.id(testID)).typeText(text);
  }

  /**
   * Clear text from element
   */
  async clearText(testID: string): Promise<void> {
    await this.waitForVisible(testID);
    await element(by.id(testID)).clearText();
  }

  /**
   * Replace text in element
   */
  async replaceText(testID: string, text: string): Promise<void> {
    await this.waitForVisible(testID);
    await element(by.id(testID)).replaceText(text);
  }

  /**
   * Swipe on element
   */
  async swipe(testID: string, direction: 'up' | 'down' | 'left' | 'right'): Promise<void> {
    await this.waitForVisible(testID);
    await element(by.id(testID)).swipe(direction);
  }

  /**
   * Scroll to element on scroll view
   */
  async scrollTo(testID: string, scrollViewTestID: string, direction: 'up' | 'down' = 'down'): Promise<void> {
    await waitFor(element(by.id(testID)))
      .toBeVisible()
      .whileScrolling(element(by.id(scrollViewTestID)), direction)
      .withTimeout(this.timeout);
  }

  /**
   * Assert element is visible
   */
  async assertElementVisible(testID: string): Promise<void> {
    await expect(element(by.id(testID))).toBeVisible();
  }

  /**
   * Assert element exists
   */
  async assertElementExists(testID: string): Promise<void> {
    await expect(element(by.id(testID))).toExist();
  }

  /**
   * Assert element has text
   */
  async assertElementHasText(testID: string, text: string): Promise<void> {
    await expect(element(by.id(testID))).toHaveText(text);
  }

  /**
   * Assert element is not visible
   */
  async assertElementNotVisible(testID: string): Promise<void> {
    await expect(element(by.id(testID))).not.toBeVisible();
  }

  /**
   * Take screenshot (for debugging)
   */
  async takeScreenshot(name: string): Promise<string> {
    return await device.takeScreenshot(name);
  }

  /**
   * Get device info
   */
  async getDeviceInfo(): Promise<{ platform: string; id: string }> {
    return {
      platform: device.getPlatform(),
      id: await device.getDeviceId(),
    };
  }

  /**
   * Launch app with specific args
   */
  async launchAppWithArgs(args: Record<string, any>): Promise<void> {
    await device.launchApp({
      newInstance: true,
      launchArgs: args,
    });
  }

  /**
   * Relaunch app
   */
  async relaunchApp(): Promise<void> {
    await device.reloadReactNative();
  }

  /**
   * Wait for element with custom matcher
   */
  async waitForElementByLabel(label: string, timeout?: number): Promise<void> {
    const elem = element(by.label(label));
    await waitFor(elem)
      .toBeVisible()
      .withTimeout(timeout || this.timeout);
  }

  /**
   * Tap element by label (accessibilityLabel)
   */
  async tapByLabel(label: string): Promise<void> {
    await element(by.label(label)).tap();
  }

  /**
   * Get element text
   */
  async getElementText(testID: string): Promise<string> {
    const attrs = await element(by.id(testID)).getAttributes();
    return attrs.text || '';
  }
}
