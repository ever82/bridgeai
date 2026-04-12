/**
 * Mock for @visionshare/shared
 */

export const isAndFilter = (expr: any): boolean => 'and' in expr && Array.isArray(expr.and);
export const isOrFilter = (expr: any): boolean => 'or' in expr && Array.isArray(expr.or);
export const isNotFilter = (expr: any): boolean => 'not' in expr && !Array.isArray(expr.not);

// Credit level type (string literal union)
export type CreditLevel = 'excellent' | 'good' | 'average' | 'poor';

// Credit level thresholds
export const CREDIT_LEVEL_THRESHOLDS: Record<CreditLevel, { min: number; max: number }> = {
  excellent: { min: 800, max: 1000 },
  good: { min: 600, max: 799 },
  average: { min: 400, max: 599 },
  poor: { min: 0, max: 399 },
};

// Keep enum for backward compatibility
export enum CreditLevelEnum {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  AVERAGE = 'average',
  POOR = 'poor',
}

export enum CreditFactorType {
  PROFILE = 'profile',
  BEHAVIOR = 'behavior',
  TRANSACTION = 'transaction',
  SOCIAL = 'social',
}

// Filter types
export interface FilterCondition {
  field: string;
  operator: string;
  value: any;
}

export interface FilterExpression {
  and?: FilterCondition[];
  or?: FilterCondition[];
  not?: FilterCondition;
}

export interface FilterDSL {
  where: FilterCondition | FilterExpression;
}

// Agent Message Protocol exports
export enum AgentMessageType {
  DIRECT = 'direct',
  GROUP = 'group',
  SYSTEM = 'system',
  COMMAND = 'command',
  RESPONSE = 'response',
  STATUS = 'status',
  ERROR = 'error',
}

export enum AgentType {
  PERSONAL = 'personal',
  BUSINESS = 'business',
  SERVICE = 'service',
  SYSTEM = 'system',
}

export enum MessagePriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4,
}

export enum AgentProtocolErrorCode {
  INVALID_FORMAT = 'INVALID_FORMAT',
  UNSUPPORTED_VERSION = 'UNSUPPORTED_VERSION',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED',
  CONTENT_VIOLATION = 'CONTENT_VIOLATION',
  RECIPIENT_NOT_FOUND = 'RECIPIENT_NOT_FOUND',
  MESSAGE_EXPIRED = 'MESSAGE_EXPIRED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface AgentMessageMetadata {
  version: string;
  timestamp: string;
  priority: MessagePriority;
  requireAck: boolean;
  ttl: number;
  traceId: string;
  custom?: Record<string, unknown>;
}

export interface AgentIdentity {
  agentId: string;
  displayName: string;
  type: AgentType;
  ownerId: string;
  ownerName: string;
  avatarUrl?: string;
  trustScore: number;
  isVerified: boolean;
  capabilities: string[];
}

export interface AgentCreditInfo {
  score: number;
  level: number;
  trend: 'up' | 'down' | 'stable';
  history: Array<{
    date: string;
    score: number;
  }>;
  description: string;
}

export interface AgentMessage {
  id: string;
  type: AgentMessageType;
  sender: AgentIdentity;
  recipientId: string;
  content: {
    text?: string;
    data?: Record<string, unknown>;
    attachments?: Array<{
      type: string;
      url: string;
      name: string;
      size: number;
    }>;
  };
  metadata: AgentMessageMetadata;
  replyTo?: string;
  creditInfo?: AgentCreditInfo;
}

export interface AgentProtocolError {
  code: AgentProtocolErrorCode;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export const PROTOCOL_VERSION = '1.0.0';

export function validateAgentMessage(message: unknown): {
  valid: boolean;
  errors: string[];
} {
  return { valid: true, errors: [] };
}

export function createAgentMessage(params: any): AgentMessage {
  return {
    id: `msg_${Date.now()}`,
    type: params.type || AgentMessageType.DIRECT,
    sender: params.sender,
    recipientId: params.recipientId,
    content: params.content,
    metadata: {
      version: PROTOCOL_VERSION,
      timestamp: new Date().toISOString(),
      priority: params.priority || MessagePriority.NORMAL,
      requireAck: false,
      ttl: 0,
      traceId: `trace_${Date.now()}`,
      custom: params.customMetadata,
    },
    replyTo: params.replyTo,
    creditInfo: params.creditInfo,
  };
}

export function isVersionCompatible(version: string): boolean {
  return version.startsWith('1.');
}

export function serializeMessage(message: AgentMessage): string {
  return JSON.stringify(message);
}

export function parseMessage(json: string): AgentMessage | null {
  try {
    return JSON.parse(json) as AgentMessage;
  } catch {
    return null;
  }
}
