/**
 * Web Push Adapter
 * Handles push notifications for web browsers using Web Push protocol
 */
import { IAdapter, PushPayload, ISendResult, PushAdapterConfig } from './IAdapter';
/**
 * Web Push Adapter implementation
 */
export declare class WebPushAdapter implements IAdapter {
    private initialized;
    /**
     * Initialize Web Push adapter with VAPID keys
     */
    initialize(config?: PushAdapterConfig): Promise<void>;
    /**
     * Send a push notification to a web browser
     */
    send(token: string, payload: PushPayload): Promise<ISendResult>;
    /**
     * Check if adapter is properly configured
     */
    isConfigured(): boolean;
    /**
     * Get the provider name
     */
    getProviderName(): string;
    /**
     * Get VAPID public key for client subscription
     */
    getVapidPublicKey(): string;
    /**
     * Get user subscription from database
     */
    private getSubscription;
    /**
     * Deactivate expired/invalid subscription
     */
    private deactivateSubscription;
    /**
     * Build push payload from PushMessage
     */
    private buildPayload;
}
export declare const webPushAdapter: WebPushAdapter;
export default webPushAdapter;
//# sourceMappingURL=WebPushAdapter.d.ts.map