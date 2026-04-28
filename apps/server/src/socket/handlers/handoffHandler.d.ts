/**
 * Handoff Socket Event Handlers
 *
 * Handles human-agent conversation switching via socket events.
 */
import type { Namespace } from 'socket.io';
import { type HandoffRequest, type HandoffAuditLog } from '@bridgeai/shared';
import type { AuthenticatedSocket } from '../middleware/auth';
interface HandoffState {
    conversationId: string;
    currentStatus: string;
    previousStatus: string;
    currentHandler: string | null;
    currentHandlerType: string;
    activeRequest: any;
    lastHandoffAt: string | null;
    handoffHistory: Array<{
        id: string;
        timestamp: string;
        fromStatus: string;
        toStatus: string;
        fromHandler: string | null;
        toHandler: string | null;
    }>;
}
/**
 * Register handoff event handlers
 */
export declare function registerHandoffHandlers(socket: AuthenticatedSocket, nsp: Namespace): void;
/**
 * Get handoff state for a conversation
 */
export declare function getHandoffState(conversationId: string): HandoffState | undefined;
/**
 * Get handoff request by ID
 */
export declare function getHandoffRequest(requestId: string): HandoffRequest | undefined;
/**
 * Get audit logs for a conversation
 */
export declare function getHandoffAuditLogs(conversationId: string): HandoffAuditLog[];
/**
 * Reset all in-memory handoff state (for testing)
 */
export declare function resetHandoffState(): void;
declare const _default: {
    registerHandoffHandlers: typeof registerHandoffHandlers;
    getHandoffState: typeof getHandoffState;
    getHandoffRequest: typeof getHandoffRequest;
    getHandoffAuditLogs: typeof getHandoffAuditLogs;
    resetHandoffState: typeof resetHandoffState;
};
export default _default;
//# sourceMappingURL=handoffHandler.d.ts.map