/**
 * Human Handoff Types
 *
 * Types for managing human-agent conversation switching.
 */

/**
 * Handoff status states
 */
export enum HandoffStatus {
  /** Agent is handling the conversation */
  AGENT_ACTIVE = 'AGENT_ACTIVE',
  /** Human has taken over the conversation */
  HUMAN_ACTIVE = 'HUMAN_ACTIVE',
  /** Pending handoff request (waiting for confirmation) */
  PENDING_TAKEOVER = 'PENDING_TAKEOVER',
  /** Pending handback request (waiting for confirmation) */
  PENDING_HANDOFF = 'PENDING_HANDOFF',
  /** Handoff request timed out */
  TIMEOUT = 'TIMEOUT',
  /** Handoff was cancelled */
  CANCELLED = 'CANCELLED',
}

/**
 * Handoff request status
 */
export enum HandoffRequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
}

/**
 * Sender type for messages
 */
export enum SenderType {
  AGENT = 'AGENT',
  HUMAN = 'HUMAN',
  SYSTEM = 'SYSTEM',
  TRANSITION = 'TRANSITION',
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
  currentHandler: string | null; // userId of current handler (agent or human)
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
export enum HandoffSocketEvents {
  // Client -> Server
  REQUEST_TAKEOVER = 'handoff:request_takeover',
  REQUEST_HANDOFF = 'handoff:request_handoff',
  CONFIRM_HANDOFF = 'handoff:confirm',
  REJECT_HANDOFF = 'handoff:reject',
  CANCEL_HANDOFF = 'handoff:cancel',

  // Server -> Client
  HANDOFF_REQUESTED = 'handoff:requested',
  HANDOFF_CONFIRMED = 'handoff:confirmed',
  HANDOFF_REJECTED = 'handoff:rejected',
  HANDOFF_TIMEOUT = 'handoff:timeout',
  HANDOFF_CANCELLED = 'handoff:cancelled',
  HANDOFF_STATUS_CHANGED = 'handoff:status_changed',
  HANDOFF_ERROR = 'handoff:error',
}

/**
 * Handoff error codes
 */
export enum HandoffErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_STATUS = 'INVALID_STATUS',
  REQUEST_NOT_FOUND = 'REQUEST_NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  ALREADY_PENDING = 'ALREADY_PENDING',
  FORCE_TAKEOVER_DISABLED = 'FORCE_TAKEOVER_DISABLED',
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
export const DEFAULT_HANDOFF_CONFIG: HandoffConfig = {
  requestTimeoutSeconds: 30,
  minHandoffIntervalSeconds: 5,
  maxHandoffsPerHour: 60,
  allowForcedTakeover: true,
  allowedRoles: ['admin', 'moderator', 'agent', 'user'],
};

/**
 * Handoff status display labels
 */
export const HANDOFF_STATUS_LABELS: Record<HandoffStatus, string> = {
  [HandoffStatus.AGENT_ACTIVE]: 'AI Agent',
  [HandoffStatus.HUMAN_ACTIVE]: 'Human Support',
  [HandoffStatus.PENDING_TAKEOVER]: 'Requesting Takeover...',
  [HandoffStatus.PENDING_HANDOFF]: 'Requesting Handoff...',
  [HandoffStatus.TIMEOUT]: 'Request Timed Out',
  [HandoffStatus.CANCELLED]: 'Cancelled',
};

/**
 * Sender type display labels
 */
export const SENDER_TYPE_LABELS: Record<SenderType, string> = {
  [SenderType.AGENT]: 'AI Agent',
  [SenderType.HUMAN]: 'Human',
  [SenderType.SYSTEM]: 'System',
  [SenderType.TRANSITION]: 'Transition',
};

/**
 * Sender type colors for UI
 */
export const SENDER_TYPE_COLORS: Record<SenderType, string> = {
  [SenderType.AGENT]: '#4CAF50',
  [SenderType.HUMAN]: '#2196F3',
  [SenderType.SYSTEM]: '#757575',
  [SenderType.TRANSITION]: '#FF9800',
};

/**
 * Check if handoff status allows sending messages
 */
export function canSendMessages(status: HandoffStatus): boolean {
  return status === HandoffStatus.AGENT_ACTIVE || status === HandoffStatus.HUMAN_ACTIVE;
}

/**
 * Check if handoff is pending
 */
export function isHandoffPending(status: HandoffStatus): boolean {
  return status === HandoffStatus.PENDING_TAKEOVER || status === HandoffStatus.PENDING_HANDOFF;
}

/**
 * Check if user can request takeover
 */
export function canRequestTakeover(
  currentStatus: HandoffStatus,
  userRole: string,
  allowedRoles: string[]
): boolean {
  if (!allowedRoles.includes(userRole)) {
    return false;
  }
  return currentStatus === HandoffStatus.AGENT_ACTIVE && !isHandoffPending(currentStatus);
}

/**
 * Check if user can request handoff
 */
export function canRequestHandoff(
  currentStatus: HandoffStatus,
  userRole: string,
  allowedRoles: string[]
): boolean {
  if (!allowedRoles.includes(userRole)) {
    return false;
  }
  return currentStatus === HandoffStatus.HUMAN_ACTIVE && !isHandoffPending(currentStatus);
}

/**
 * Create initial handoff state
 */
export function createInitialHandoffState(conversationId: string): HandoffState {
  return {
    conversationId,
    currentStatus: HandoffStatus.AGENT_ACTIVE,
    previousStatus: HandoffStatus.AGENT_ACTIVE,
    currentHandler: null,
    currentHandlerType: SenderType.AGENT,
    activeRequest: null,
    lastHandoffAt: null,
    handoffHistory: [],
  };
}
