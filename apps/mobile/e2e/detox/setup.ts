import { element, by, waitFor } from 'detox';

/**
 * Detox E2E test setup - runs before each test suite.
 * Provides shared utilities for mobile E2E tests.
 */

// Re-export detox primitives for convenience
export { device, element, by, waitFor, expect } from 'detox';

/** Default timeout for element visibility waits */
export const DEFAULT_TIMEOUT = 10_000;

/**
 * Wait for an element with a given testID to become visible.
 */
export async function waitForId(testID: string, timeout = DEFAULT_TIMEOUT): Promise<void> {
  await waitFor(element(by.id(testID)))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Tap an element identified by testID.
 */
export async function tapId(testID: string): Promise<void> {
  await element(by.id(testID)).tap();
}

/**
 * Type text into an element identified by testID.
 */
export async function typeIntoId(testID: string, text: string): Promise<void> {
  await element(by.id(testID)).typeText(text);
}
