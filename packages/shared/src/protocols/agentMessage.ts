/**
 * Agent Message Protocol
 * Defines the communication protocol between Agents in the system
 * @version 1.0.0
 */

/**
 * Protocol version for message compatibility
 */
export const PROTOCOL_VERSION = '1.0.0';

/**
 * Message types supported in the Agent protocol
 */
export enum AgentMessageType {
  /** Direct message between users/agents */
  DIRECT = 'direct',
  /** Group chat message */
  GROUP = 'group',
  /** System notification */
  SYSTEM = 'system',
  /** Command instruction */
  COMMAND = 'command',
  /** Response to a command */
  RESPONSE = 'response',
  /** Status update */
  STATUS = 'status',
  /** Error message */
  ERROR = 'error',
}

/**
 * Agent types for identification
 */
export enum AgentType {
  /** Personal assistant agent */
  PERSONAL = 'personal',
  /** Business/enterprise agent */
  BUSINESS = 'business',
  /** Service provider agent */
  SERVICE = 'service',
  /** System agent */
  SYSTEM = 'system',
}

/**
 * Message priority levels
 */
export enum MessagePriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4,
}

/**
 * Message metadata containing protocol information
 */
export interface AgentMessageMetadata {
  /** Protocol version */
  version: string;
  /** Timestamp when message was created (ISO 8601) */
  timestamp: string;
  /** Message priority level */
  priority: MessagePriority;
  /** Whether message requires acknowledgment */
  requireAck: boolean;
  /** Message expiration time in seconds (0 = no expiration) */
  ttl: number;
  /** Unique trace ID for request tracking */
  traceId: string;
  /** Additional custom metadata */
  custom?: Record<string, unknown>;
}

/**
 * Agent identity information
 */
export interface AgentIdentity {
  /** Unique agent ID */
  agentId: string;
  /** Display name */
  displayName: string;
  /** Agent type */
  type: AgentType;
  /** Owner user ID */
  ownerId: string;
  /** Owner display name */
  ownerName: string;
  /** Agent avatar URL */
  avatarUrl?: string;
  /** Trust score (0-100) */
  trustScore: number;
  /** Whether the agent is verified */
  isVerified: boolean;
  /** Agent capabilities */
  capabilities: string[];
}

/**
 * Credit score information
 */
export interface AgentCreditInfo {
  /** Current credit score (0-1000) */
  score: number;
  /** Credit level (1-5) */
  level: number;
  /** Score trend direction */
  trend: 'up' | 'down' | 'stable';
  /** History data points for trend visualization */
  history: Array<{
    date: string;
    score: number;
  }>;
  /** Description of credit standing */
  description: string;
}

/**
 * Core Agent message structure
 */
export interface AgentMessage {
  /** Unique message ID (UUID) */
  id: string;
  /** Message type */
  type: AgentMessageType;
  /** Sender identity */
  sender: AgentIdentity;
  /** Recipient ID (user or group ID) */
  recipientId: string;
  /** Message content */
  content: {
    /** Text content */
    text?: string;
    /** Structured data payload */
    data?: Record<string, unknown>;
    /** Media attachments */
    attachments?: Array<{
      type: string;
      url: string;
      name: string;
      size: number;
    }>;
  };
  /** Message metadata */
  metadata: AgentMessageMetadata;
  /** Reference to original message (for replies) */
  replyTo?: string;
  /** Credit information of sender (optional) */
  creditInfo?: AgentCreditInfo;
}

/**
 * Protocol error codes
 */
export enum AgentProtocolErrorCode {
  /** Invalid message format */
  INVALID_FORMAT = 'INVALID_FORMAT',
  /** Unsupported protocol version */
  UNSUPPORTED_VERSION = 'UNSUPPORTED_VERSION',
  /** Sender not authorized */
  UNAUTHORIZED = 'UNAUTHORIZED',
  /** Rate limit exceeded */
  RATE_LIMITED = 'RATE_LIMITED',
  /** Message content violation */
  CONTENT_VIOLATION = 'CONTENT_VIOLATION',
  /** Recipient not found */
  RECIPIENT_NOT_FOUND = 'RECIPIENT_NOT_FOUND',
  /** Message expired */
  MESSAGE_EXPIRED = 'MESSAGE_EXPIRED',
  /** Internal server error */
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Protocol error response
 */
export interface AgentProtocolError {
  /** Error code */
  code: AgentProtocolErrorCode;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: Record<string, unknown>;
  /** Timestamp of error */
  timestamp: string;
}

/**
 * Validate message format
 * @param message - Message to validate
 * @returns Validation result
 */
export function validateAgentMessage(message: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!message || typeof message !== 'object') {
    errors.push('Message must be an object');
    return { valid: false, errors };
  }

  const msg = message as Record<string, unknown>;

  // Required fields
  if (!msg.id || typeof msg.id !== 'string') {
    errors.push('Message id is required and must be a string');
  }

  if (!msg.type || !Object.values(AgentMessageType).includes(msg.type as AgentMessageType)) {
    errors.push(`Message type must be one of: ${Object.values(AgentMessageType).join(', ')}`);
  }

  if (!msg.sender || typeof msg.sender !== 'object') {
    errors.push('Message sender is required and must be an object');
  }

  if (!msg.recipientId || typeof msg.recipientId !== 'string') {
    errors.push('Message recipientId is required and must be a string');
  }

  if (!msg.content || typeof msg.content !== 'object') {
    errors.push('Message content is required and must be an object');
  }

  if (!msg.metadata || typeof msg.metadata !== 'object') {
    errors.push('Message metadata is required and must be an object');
  } else {
    const metadata = msg.metadata as Record<string, unknown>;
    if (!metadata.version || typeof metadata.version !== 'string') {
      errors.push('Metadata version is required');
    }
    if (!metadata.timestamp || typeof metadata.timestamp !== 'string') {
      errors.push('Metadata timestamp is required');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Create a new agent message
 * @param params - Message parameters
 * @returns Constructed agent message
 */
export function createAgentMessage(params: {
  type: AgentMessageType;
  sender: AgentIdentity;
  recipientId: string;
  content: AgentMessage['content'];
  priority?: MessagePriority;
  replyTo?: string;
  creditInfo?: AgentCreditInfo;
  customMetadata?: Record<string, unknown>;
}): AgentMessage {
  const traceId = generateTraceId();

  return {
    id: generateMessageId(),
    type: params.type,
    sender: params.sender,
    recipientId: params.recipientId,
    content: params.content,
    metadata: {
      version: PROTOCOL_VERSION,
      timestamp: new Date().toISOString(),
      priority: params.priority ?? MessagePriority.NORMAL,
      requireAck: false,
      ttl: 0,
      traceId,
      custom: params.customMetadata,
    },
    replyTo: params.replyTo,
    creditInfo: params.creditInfo,
  };
}

/**
 * Generate a unique message ID
 * @returns UUID string
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a trace ID for request tracking
 * @returns Trace ID string
 */
function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if protocol version is compatible
 * @param version - Version string to check
 * @returns Whether version is compatible
 */
export function isVersionCompatible(version: string): boolean {
  const [major] = version.split('.');
  const [currentMajor] = PROTOCOL_VERSION.split('.');
  return major === currentMajor;
}

/**
 * Serialize message to JSON string
 * @param message - Agent message
 * @returns JSON string
 */
export function serializeMessage(message: AgentMessage): string {
  return JSON.stringify(message);
}

/**
 * Parse message from JSON string
 * @param json - JSON string
 * @returns Parsed message or null if invalid
 */
export function parseMessage(json: string): AgentMessage | null {
  try {
    const parsed = JSON.parse(json);
    const { valid } = validateAgentMessage(parsed);
    return valid ? (parsed as AgentMessage) : null;
  } catch {
    return null;
  }
}
