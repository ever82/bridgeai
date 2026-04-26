/**
 * Human Handoff Types
 *
 * Types for managing human-agent conversation switching.
 */
/**
 * Handoff status states
 */
export declare enum HandoffStatus {
    /** Agent is handling the conversation */
    AGENT_ACTIVE = "AGENT_ACTIVE",
    /** Human has taken over the conversation */
    HUMAN_ACTIVE = "HUMAN_ACTIVE",
    /** Pending handoff request (waiting for confirmation) */
    PENDING_TAKEOVER = "PENDING_TAKEOVER",
    /** Pending handback request (waiting for confirmation) */
    PENDING_HANDOFF = "PENDING_HANDOFF",
    /** Handoff request timed out */
    TIMEOUT = "TIMEOUT",
    /** Handoff was cancelled */
    CANCELLED = "CANCELLED"
}
/**
 * Handoff request status
 */
export declare enum HandoffRequestStatus {
    PENDING = "PENDING",
    ACCEPTED = "ACCEPTED",
    REJECTED = "REJECTED",
    TIMEOUT = "TIMEOUT",
    CANCELLED = "CANCELLED"
}
/**
 * Sender type for messages
 */
export declare enum SenderType {
    AGENT = "AGENT",
    HUMAN = "HUMAN",
    SYSTEM = "SYSTEM",
    TRANSITION = "TRANSITION"
}
/**
 * Handoff request data
 */
export interface HandoffRequest {
    id: string;
    conversationId: string;
    requestType: 'takeover' | 'handoff';
    requestedBy: string;
    requestedAt: string;
    status: HandoffRequestStatus;
    timeoutAt: string;
    reason?: string;
}
/**
 * Handoff response data
 */
export interface HandoffResponse {
    requestId: string;
    accepted: boolean;
    respondedBy: string;
    respondedAt: string;
    reason?: string;
}
/**
 * Handoff state for a conversation
 */
export interface HandoffState {
    conversationId: string;
    currentStatus: HandoffStatus;
    previousStatus: HandoffStatus;
    currentHandler: string | null;
    currentHandlerType: SenderType;
    activeRequest: HandoffRequest | null;
    lastHandoffAt: string | null;
    handoffHistory: HandoffHistoryEntry[];
}
/**
 * Handoff history entry
 */
export interface HandoffHistoryEntry {
    id: string;
    timestamp: string;
    fromStatus: HandoffStatus;
    toStatus: HandoffStatus;
    fromHandler: string | null;
    toHandler: string | null;
    reason?: string;
}
/**
 * Handoff audit log entry
 */
export interface HandoffAuditLog {
    id: string;
    conversationId: string;
    action: 'REQUEST_TAKEOVER' | 'REQUEST_HANDOFF' | 'CONFIRM_TAKEOVER' | 'CONFIRM_HANDOFF' | 'REJECT' | 'TIMEOUT' | 'CANCEL' | 'FORCE_TAKEOVER';
    performedBy: string;
    performedAt: string;
    metadata?: Record<string, any>;
}
/**
 * Handoff configuration
 */
export interface HandoffConfig {
    /** Timeout in seconds for handoff requests */
    requestTimeoutSeconds: number;
    /** Minimum seconds between handoffs (rate limiting) */
    minHandoffIntervalSeconds: number;
    /** Maximum handoffs per hour */
    maxHandoffsPerHour: number;
    /** Whether to allow forced takeovers */
    allowForcedTakeover: boolean;
    /** Roles that can perform handoffs */
    allowedRoles: string[];
}
/**
 * Socket events for handoff
 */
export declare enum HandoffSocketEvents {
    REQUEST_TAKEOVER = "handoff:request_takeover",
    REQUEST_HANDOFF = "handoff:request_handoff",
    CONFIRM_HANDOFF = "handoff:confirm",
    REJECT_HANDOFF = "handoff:reject",
    CANCEL_HANDOFF = "handoff:cancel",
    HANDOFF_REQUESTED = "handoff:requested",
    HANDOFF_CONFIRMED = "handoff:confirmed",
    HANDOFF_REJECTED = "handoff:rejected",
    HANDOFF_TIMEOUT = "handoff:timeout",
    HANDOFF_CANCELLED = "handoff:cancelled",
    HANDOFF_STATUS_CHANGED = "handoff:status_changed",
    HANDOFF_ERROR = "handoff:error"
}
/**
 * Handoff error codes
 */
export declare enum HandoffErrorCode {
    UNAUTHORIZED = "UNAUTHORIZED",
    RATE_LIMITED = "RATE_LIMITED",
    INVALID_STATUS = "INVALID_STATUS",
    REQUEST_NOT_FOUND = "REQUEST_NOT_FOUND",
    TIMEOUT = "TIMEOUT",
    ALREADY_PENDING = "ALREADY_PENDING",
    FORCE_TAKEOVER_DISABLED = "FORCE_TAKEOVER_DISABLED"
}
/**
 * Handoff error
 */
export interface HandoffError {
    code: HandoffErrorCode;
    message: string;
}
/**
 * Default handoff configuration
 */
export declare const DEFAULT_HANDOFF_CONFIG: HandoffConfig;
/**
 * Handoff status display labels
 */
export declare const HANDOFF_STATUS_LABELS: Record<HandoffStatus, string>;
/**
 * Sender type display labels
 */
export declare const SENDER_TYPE_LABELS: Record<SenderType, string>;
/**
 * Sender type colors for UI
 */
export declare const SENDER_TYPE_COLORS: Record<SenderType, string>;
/**
 * Check if handoff status allows sending messages
 */
export declare function canSendMessages(status: HandoffStatus): boolean;
/**
 * Check if handoff is pending
 */
export declare function isHandoffPending(status: HandoffStatus): boolean;
/**
 * Check if user can request takeover
 */
export declare function canRequestTakeover(currentStatus: HandoffStatus, userRole: string, allowedRoles: string[]): boolean;
/**
 * Check if user can request handoff
 */
export declare function canRequestHandoff(currentStatus: HandoffStatus, userRole: string, allowedRoles: string[]): boolean;
/**
 * Create initial handoff state
 */
export declare function createInitialHandoffState(conversationId: string): HandoffState;
//# sourceMappingURL=handoff.d.ts.map