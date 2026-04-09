import { by, element, expect } from 'detox';
import { BasePage } from './BasePage';

/**
 * Login Page Object
 * Handles login screen interactions
 */
export class LoginPage extends BasePage {
  // Element testIDs
  private readonly emailInputTestID = 'login-email-input';
  private readonly passwordInputTestID = 'login-password-input';
  private readonly loginButtonTestID = 'login-button';
  private readonly registerButtonTestID = 'register-button';
  private readonly errorMessageTestID = 'error-message';
  private readonly userAvatarTestID = 'user-avatar';

  /**
   * Navigate to login page (if not already there)
   */
  async navigateToLogin(): Promise<void> {
    // App launches to login by default
    await this.waitForVisible(this.loginButtonTestID);
  }

  /**
   * Enter email address
   */
  async enterEmail(email: string): Promise<void> {
    await this.typeText(this.emailInputTestID, email);
  }

  /**
   * Enter password
   */
  async enterPassword(password: string): Promise<void> {
    await this.typeText(this.passwordInputTestID, password);
  }

  /**
   * Clear email field
   */
  async clearEmail(): Promise<void> {
    await this.clearText(this.emailInputTestID);
  }

  /**
   * Clear password field
   */
  async clearPassword(): Promise<void> {
    await this.clearText(this.passwordInputTestID);
  }

  /**
   * Tap login button
   */
  async tapLogin(): Promise<void> {
    await this.tap(this.loginButtonTestID);
  }

  /**
   * Tap register button
   */
  async tapRegister(): Promise<void> {
    await this.tap(this.registerButtonTestID);
  }

  /**
   * Complete login flow
   */
  async login(email: string, password: string): Promise<void> {
    await this.enterEmail(email);
    await this.enterPassword(password);
    await this.tapLogin();
  }

  /**
   * Assert login success - redirected to home
   */
  async assertLoginSuccess(): Promise<void> {
    await this.waitForVisible(this.userAvatarTestID, 15000);
    await expect(element(by.id(this.userAvatarTestID))).toBeVisible();
  }

  /**
   * Assert login error displayed
   */
  async assertLoginError(): Promise<void> {
    await this.waitForVisible(this.errorMessageTestID, 5000);
    await expect(element(by.id(this.errorMessageTestID))).toBeVisible();
  }

  /**
   * Assert email input is visible
   */
  async assertEmailInputVisible(): Promise<void> {
    await this.assertElementVisible(this.emailInputTestID);
  }

  /**
   * Assert password input is visible
   */
  async assertPasswordInputVisible(): Promise<void> {
    await this.assertElementVisible(this.passwordInputTestID);
  }

  /**
   * Assert login button is enabled
   */
  async assertLoginButtonEnabled(): Promise<void> {
    await this.waitForVisible(this.loginButtonTestID);
    // Check if button is not disabled
    const attrs = await element(by.id(this.loginButtonTestID)).getAttributes();
    // If disabled attribute exists, it should be false
    if (attrs.disabled !== undefined) {
      expect(attrs.disabled).toBeFalsy();
    }
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    return await this.getElementText(this.errorMessageTestID);
  }

  /**
   * Assert on login page
   */
  async assertOnLoginPage(): Promise<void> {
    await this.assertElementVisible(this.emailInputTestID);
    await this.assertElementVisible(this.passwordInputTestID);
    await this.assertElementVisible(this.loginButtonTestID);
  }
}
