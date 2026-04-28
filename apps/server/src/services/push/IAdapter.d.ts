/**
 * Push Adapter Interface
 * Unified interface for all push notification providers (APNs, FCM, Web Push)
 */
export interface PushAdapterConfig {
    enabled: boolean;
    priority?: number;
}
export interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    renotify?: boolean;
    data?: Record<string, unknown>;
    actions?: PushAction[];
    vibrate?: number[];
    requireInteraction?: boolean;
    image?: string;
    video?: string;
}
export interface PushAction {
    action: string;
    title: string;
    icon?: string;
}
export interface PushResult {
    success: boolean;
    messageId?: string;
    error?: string;
}
export interface ISendResult {
    success: boolean;
    messageId?: string;
    deliveryId?: string;
    error?: string;
}
/**
 * Base interface for all push notification adapters
 */
export interface IAdapter {
    /**
     * Initialize the adapter with configuration
     */
    initialize(config?: PushAdapterConfig): Promise<void>;
    /**
     * Send a push notification to a specific device token
     */
    send(token: string, payload: PushPayload): Promise<ISendResult>;
    /**
     * Check if the adapter is properly configured and ready
     */
    isConfigured(): boolean;
    /**
     * Get the adapter provider name
     */
    getProviderName(): string;
}
export default IAdapter;
//# sourceMappingURL=IAdapter.d.ts.map