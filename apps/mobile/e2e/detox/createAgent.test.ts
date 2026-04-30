/**
 * E2E test: CreateAgentScreen 5-step wizard
 *
 * Verifies that the CreateAgentScreen loads correctly and each step
 * of the multi-step wizard is navigable. This test validates the
 * critical path identified in NP-2085.
 *
 * Prerequisites:
 *   - App built and installed on simulator/emulator
 *   - Test user account available (see e2e/support/data-factory)
 *   - Run with: npx detox test -c ios.sim.debug
 */

import { device, element, by, expect } from 'detox';

import { waitForId, tapId, typeIntoId } from './setup';

const TIMEOUT = 30_000;

describe('CreateAgentScreen - 5-step wizard', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it('should navigate to CreateAgent screen from agent list', async () => {
    // Wait for login screen and authenticate
    await waitForId('login-email-input', TIMEOUT);
    await typeIntoId('login-email-input', 'e2e-detox@bridgeai.test');
    await typeIntoId('login-password-input', 'TestPass123!');
    await tapId('login-button');

    // Wait for home screen
    await waitForId('home-header', TIMEOUT);

    // Navigate to profile tab
    await tapId('profile-tab');
    await waitForId('profile-logout-button');

    // Navigate to agent list
    await element(by.text('My Agents')).tap();
    await waitForId('agent-list-screen', TIMEOUT);

    // Tap create button
    await tapId('agent-list-create-button');
    await waitForId('create-agent-step-indicator', TIMEOUT);
  });

  it('Step 1: should display basic info form with name and description inputs', async () => {
    await waitForId('create-agent-name-input', TIMEOUT);
    await expect(element(by.id('create-agent-name-input'))).toBeVisible();
    await expect(element(by.id('create-agent-description-input'))).toBeVisible();
    await expect(element(by.id('create-agent-next-button'))).toBeVisible();

    // Fill in basic info
    await typeIntoId('create-agent-name-input', 'Detox Test Agent');
    await typeIntoId('create-agent-description-input', 'Created by Detox E2E test');
  });

  it('Step 2: should display agent type selection after navigating next', async () => {
    await tapId('create-agent-next-button');
    await waitForId('create-agent-type-VISIONSHARE', TIMEOUT);
    await expect(element(by.id('create-agent-type-VISIONSHARE'))).toBeVisible();

    // Select an agent type
    await tapId('create-agent-type-VISIONSHARE');
  });

  it('Step 3: should advance to configuration step', async () => {
    await tapId('create-agent-next-button');
    // Step 3 is configuration - just verify next button exists to proceed
    await waitForId('create-agent-next-button', TIMEOUT);
  });

  it('Step 4: should advance to privacy settings step', async () => {
    await tapId('create-agent-next-button');
    // Step 4 is privacy/settings - verify next button exists
    await waitForId('create-agent-next-button', TIMEOUT);
  });

  it('Step 5: should display preview and submit button', async () => {
    await tapId('create-agent-next-button');
    await waitForId('create-agent-submit', TIMEOUT);
    await expect(element(by.id('create-agent-submit'))).toBeVisible();
  });
});
