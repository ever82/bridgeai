/**
 * Web Push Adapter
 * Handles push notifications for web browsers using Web Push protocol
 */

import webpush from 'web-push';

import { prisma } from '../../db/client';

import { IAdapter, PushPayload, ISendResult, PushAdapterConfig } from './IAdapter';

// VAPID keys should be generated once and stored in environment variables
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.WEB_PUSH_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.WEB_PUSH_VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.WEB_PUSH_VAPID_SUBJECT || 'mailto:admin@example.com';

/**
 * Web Push Adapter implementation
 */
export class WebPushAdapter implements IAdapter {
  private initialized = false;

  /**
   * Initialize Web Push adapter with VAPID keys
   */
  async initialize(config?: PushAdapterConfig): Promise<void> {
    if (!config?.enabled) {
      this.initialized = false;
      return;
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.warn('WebPushAdapter: VAPID keys not configured. Set WEB_PUSH_VAPID_PUBLIC_KEY and WEB_PUSH_VAPID_PRIVATE_KEY');
      this.initialized = false;
      return;
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    this.initialized = true;
  }

  /**
   * Send a push notification to a web browser
   */
  async send(token: string, payload: PushPayload): Promise<ISendResult> {
    if (!this.initialized) {
      return { success: false, error: 'WebPushAdapter not initialized' };
    }

    try {
      const subscription = await this.getSubscription(token);

      if (!subscription) {
        return { success: false, error: 'No subscription found for token' };
      }

      const pushPayload = this.buildPayload(payload);

      const result = await webpush.sendNotification(subscription, JSON.stringify(pushPayload));

      return {
        success: true,
        messageId: result?.headers?.['x-sent'] || Date.now().toString(),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('WebPushAdapter: Failed to send notification:', message);

      // Handle specific errors
      if (message.includes('unsubscribed') || message.includes('expired')) {
        // Mark subscription as inactive
        await this.deactivateSubscription(token);
        return { success: false, error: 'Subscription expired or invalid' };
      }

      return { success: false, error: message };
    }
  }

  /**
   * Check if adapter is properly configured
   */
  isConfigured(): boolean {
    return this.initialized;
  }

  /**
   * Get the provider name
   */
  getProviderName(): string {
    return 'web-push';
  }

  /**
   * Get VAPID public key for client subscription
   */
  getVapidPublicKey(): string {
    return VAPID_PUBLIC_KEY;
  }

  /**
   * Get user subscription from database
   */
  private async getSubscription(token: string) {
    const webSubscription = await prisma.webPushSubscription.findFirst({
      where: {
        endpoint: token,
        isActive: true,
      },
    });

    if (!webSubscription) {
      return null;
    }

    try {
      return JSON.parse(webSubscription.subscriptionJson);
    } catch {
      return null;
    }
  }

  /**
   * Deactivate expired/invalid subscription
   */
  private async deactivateSubscription(token: string): Promise<void> {
    await prisma.webPushSubscription.updateMany({
      where: { endpoint: token },
      data: { isActive: false },
    });
  }

  /**
   * Build push payload from PushMessage
   */
  private buildPayload(payload: PushPayload) {
    return {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
      tag: payload.tag,
      renotify: payload.renotify ?? true,
      data: payload.data,
      vibrate: payload.vibrate || [200, 100, 200],
      requireInteraction: payload.requireInteraction ?? false,
      // Rich media support
      image: payload.data?.imageUrl as string | undefined,
      video: payload.data?.videoUrl as string | undefined,
      // Action buttons
      actions: payload.actions?.map(a => ({
        action: a.action,
        title: a.title,
        icon: a.icon,
      })),
    };
  }
}

// Export singleton
export const webPushAdapter = new WebPushAdapter();
export default webPushAdapter;