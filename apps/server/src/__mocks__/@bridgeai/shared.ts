/**
 * Mock for @bridgeai/shared
 */

// Disclosure Level Types
export enum DisclosureLevel {
  PUBLIC = 'PUBLIC',
  AFTER_MATCH = 'AFTER_MATCH',
  AFTER_CHAT = 'AFTER_CHAT',
  AFTER_REFERRAL = 'AFTER_REFERRAL',
}

export enum RelationshipStage {
  NONE = 'NONE',
  MATCHED = 'MATCHED',
  CHATTED = 'CHATTED',
  REFERRED = 'REFERRED',
}

export interface FieldDisclosure {
  fieldName: string;
  level: DisclosureLevel;
  isDisclosable: boolean;
  defaultLevel: DisclosureLevel;
}

export interface AgentDisclosureSettings {
  agentId: string;
  userId: string;
  fieldDisclosures: FieldDisclosure[];
  defaultLevel: DisclosureLevel;
  strictMode: boolean;
  updatedAt: string;
  createdAt: string;
}

export const DISCLOSURE_LEVEL_INFO: Record<DisclosureLevel, {
  level: DisclosureLevel;
  name: string;
  description: string;
  icon: string;
  color: string;
  order: number;
}> = {
  [DisclosureLevel.PUBLIC]: {
    level: DisclosureLevel.PUBLIC,
    name: '公开',
    description: '任何人可见',
    icon: 'globe',
    color: '#4CAF50',
    order: 0,
  },
  [DisclosureLevel.AFTER_MATCH]: {
    level: DisclosureLevel.AFTER_MATCH,
    name: '匹配后可见',
    description: '匹配成功后可见',
    icon: 'handshake',
    color: '#2196F3',
    order: 1,
  },
  [DisclosureLevel.AFTER_CHAT]: {
    level: DisclosureLevel.AFTER_CHAT,
    name: '私聊后可见',
    description: '私聊交流后可见',
    icon: 'message-circle',
    color: '#FF9800',
    order: 2,
  },
  [DisclosureLevel.AFTER_REFERRAL]: {
    level: DisclosureLevel.AFTER_REFERRAL,
    name: 'AFTER_REFERRAL',
    description: '登录后可见',
    icon: 'user-plus',
    color: '#9C27B0',
    order: 3,
  },
}

export const DEFAULT_FIELD_DISCLOSURES: FieldDisclosure[] = [
  { fieldName: 'name', level: DisclosureLevel.PUBLIC, isDisclosable: true, defaultLevel: DisclosureLevel.PUBLIC },
  { fieldName: 'email', level: DisclosureLevel.AFTER_MATCH, isDisclosable: true, defaultLevel: DisclosureLevel.AFTER_MATCH },
  { fieldName: 'phone', level: DisclosureLevel.AFTER_REFERRAL, isDisclosable: true, defaultLevel: DisclosureLevel.AFTER_REFERRAL },
];

export const DISCLOSABLE_FIELDS = ['name', 'email', 'phone', 'bio', 'location'];

export function getRequiredStage(level: DisclosureLevel): RelationshipStage {
  switch (level) {
    case DisclosureLevel.PUBLIC:
      return RelationshipStage.NONE;
    case DisclosureLevel.AFTER_MATCH:
      return RelationshipStage.MATCHED;
    case DisclosureLevel.AFTER_CHAT:
      return RelationshipStage.CHATTED;
    case DisclosureLevel.AFTER_REFERRAL:
      return RelationshipStage.REFERRED;
    default:
      return RelationshipStage.REFERRED;
  }
}


export function canDiscloseAtStage(
  requiredLevel: DisclosureLevel,
   currentStage: RelationshipStage
): boolean {
  const requiredStage = getRequiredStage(requiredLevel);
  const stageOrder: Record<RelationshipStage, number> = {
    [RelationshipStage.NONE]: 0,
    [RelationshipStage.MATCHED]: 1,
    [RelationshipStage.CHATTED]: 2,
    [RelationshipStage.REFERRED]: 3,
  };
  return stageOrder[currentStage] >= stageOrder[requiredStage];
}

export function createDefaultDisclosureSettings(agentId: string, userId: string): AgentDisclosureSettings {
  return {
    agentId,
    userId,
    fieldDisclosures: DEFAULT_FIELD_DISCLOSURES,
    defaultLevel: DisclosureLevel.AFTER_MATCH,
    strictMode: false,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

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

export function validateAgentMessage(_message: unknown): {
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

export function getSceneConfig(_sceneId: any): any {
  const validSceneIds = ['visionshare', 'agentdate', 'agentjob', 'agentad'];
  if (!_sceneId || !validSceneIds.includes(_sceneId)) {
    return undefined;
  }
  return {
    id: _sceneId,
    metadata: { name: 'VisionShare', description: 'VisionShare scene', isActive: true },
    fields: [],
    capabilities: [],
    templates: [
      { name: 'Preset 1', description: 'A preset template', prompt: 'Test prompt', isPreset: true },
    ],
    validation: {},
    ui: {},
  };
}

export function getAllSceneConfigs(): any[] {
  return [getSceneConfig('visionshare')];
}

// Scene IDs
export const SCENE_IDS: string[] = ['visionshare', 'agentdate', 'agentjob', 'agentad'];

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

// Points types
export enum SceneCode {
  VISION_SHARE = 'vision_share',
  AGENT_DATE = 'agent_date',
  AGENT_JOB = 'agent_job',
  AGENT_AD = 'agent_ad',
}

export enum PointsTransactionType {
  EARN = 'EARN',
  SPEND = 'SPEND',
  FROZEN = 'FROZEN',
  UNFROZEN = 'UNFROZEN',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
}

export enum FreezeStatus {
  FROZEN = 'FROZEN',
  RELEASED = 'RELEASED',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
}

export interface PointsAccount {
  id: string;
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  frozenAmount: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PointsTransaction {
  id: string;
  accountId: string;
  userId: string;
  type: PointsTransactionType;
  amount: number;
  balanceAfter: number;
  description?: string;
  scene?: SceneCode;
  referenceId?: string;
  metadata?: string;
  createdAt: Date;
}

export interface PointsFreeze {
  id: string;
  accountId: string;
  amount: number;
  reason: string;
  scene?: SceneCode;
  referenceId?: string;
  status: FreezeStatus;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PointsAccountResponse {
  id: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  frozenAmount: number;
  availableBalance: number;
}

export interface PointsTransactionListResponse {
  transactions: PointsTransaction[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface PointsFreezeListResponse {
  freezes: PointsFreeze[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface CreatePointsTransactionRequest {
  amount: number;
  type: PointsTransactionType;
  description?: string;
  scene?: SceneCode;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePointsFreezeRequest {
  amount: number;
  reason: string;
  scene?: SceneCode;
  referenceId?: string;
  expiresAt?: string;
}

export interface PointsOperationResult {
  success: boolean;
  transaction?: PointsTransaction;
  freeze?: PointsFreeze;
  error?: string;
}

export interface PointsRuleConfig {
  code: string;
  name: string;
  description: string;
  points: number;
  dailyLimit?: number;
  weeklyLimit?: number;
  cooldownMinutes?: number;
  enabled: boolean;
  scene?: SceneCode;
}

export interface PointsStatistics {
  totalEarned: number;
  totalSpent: number;
  currentBalance: number;
  frozenAmount: number;
  dailyEarned: number;
  weeklyEarned: number;
  dailySpent: number;
  weeklySpent: number;
}

// Dating types for AgentDate extractor
export enum PersonalityTrait {
  INTROVERTED = 'INTROVERTED',
  EXTROVERTED = 'EXTROVERTED',
  AMBIVERT = 'AMBIVERT',
  OPTIMISTIC = 'OPTIMISTIC',
  RATIONAL = 'RATIONAL',
  EMOTIONAL = 'EMOTIONAL',
  PRACTICAL = 'PRACTICAL',
  CREATIVE = 'CREATIVE',
  ADVENTUROUS = 'ADVENTUROUS',
  STABLE = 'STABLE',
  HUMOROUS = 'HUMOROUS',
  GENTLE = 'GENTLE',
  INDEPENDENT = 'INDEPENDENT',
  DEPENDABLE = 'DEPENDABLE',
}

export enum InterestCategory {
  SPORTS = 'SPORTS',
  MUSIC = 'MUSIC',
  READING = 'READING',
  TRAVEL = 'TRAVEL',
  FOOD = 'FOOD',
  MOVIES = 'MOVIES',
  GAMING = 'GAMING',
  PHOTOGRAPHY = 'PHOTOGRAPHY',
  ARTS = 'ARTS',
  TECH = 'TECH',
  FASHION = 'FASHION',
  OUTDOOR = 'OUTDOOR',
  PETS = 'PETS',
  COOKING = 'COOKING',
  DANCING = 'DANCING',
  FITNESS = 'FITNESS',
}

export enum DatingPurpose {
  SERIOUS_RELATIONSHIP = 'SERIOUS_RELATIONSHIP',
  MARRIAGE = 'MARRIAGE',
  CASUAL_DATING = 'CASUAL_DATING',
  FRIENDSHIP_FIRST = 'FRIENDSHIP_FIRST',
  COMPANIONSHIP = 'COMPANIONSHIP',
  NOT_SURE = 'NOT_SURE',
}
