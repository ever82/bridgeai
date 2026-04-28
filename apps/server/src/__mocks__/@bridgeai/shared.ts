/**
 * Mock for @bridgeai/shared
 *
 * Note: This mock provides stub types/functions for tests that don't need
 * the real module. Tests requiring real L2 schema functions should use
 * jest.requireActual('@bridgeai/shared') to bypass this mock.
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

export const DISCLOSURE_LEVEL_INFO: Record<
  DisclosureLevel,
  {
    level: DisclosureLevel;
    name: string;
    description: string;
    icon: string;
    color: string;
    order: number;
  }
> = {
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
};

export const DEFAULT_FIELD_DISCLOSURES: FieldDisclosure[] = [
  {
    fieldName: 'name',
    level: DisclosureLevel.PUBLIC,
    isDisclosable: true,
    defaultLevel: DisclosureLevel.PUBLIC,
  },
  {
    fieldName: 'email',
    level: DisclosureLevel.AFTER_MATCH,
    isDisclosable: true,
    defaultLevel: DisclosureLevel.AFTER_MATCH,
  },
  {
    fieldName: 'phone',
    level: DisclosureLevel.AFTER_REFERRAL,
    isDisclosable: true,
    defaultLevel: DisclosureLevel.AFTER_REFERRAL,
  },
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

export function createDefaultDisclosureSettings(
  agentId: string,
  userId: string
): AgentDisclosureSettings {
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
export const isFilterCondition = (expr: any): boolean =>
  'field' in expr && 'operator' in expr && 'value' in expr;

// SceneId enum
export enum SceneId {
  visionshare = 'visionshare',
  agentdate = 'agentdate',
  agentjob = 'agentjob',
  agentad = 'agentad',
}

// Attribute filter types
export interface RangeFilter {
  min?: number;
  max?: number;
}

export interface EnumFilter<T = string> {
  include?: T[];
  exclude?: T[];
}

export interface TagsOverlapFilter {
  tags: string[];
  minOverlap?: number;
}

export interface VisionShareAttributeFilter {
  contentType?: EnumFilter;
  purpose?: EnumFilter;
  style?: EnumFilter;
  experienceLevel?: EnumFilter;
  priceRange?: RangeFilter;
  skillsOverlap?: TagsOverlapFilter;
}

export interface AgentDateAttributeFilter {
  ageRange?: RangeFilter;
  gender?: EnumFilter<Gender>;
  maritalStatus?: EnumFilter;
  hasChildren?: boolean;
  incomeRange?: RangeFilter;
  propertyStatus?: EnumFilter;
  education?: EnumFilter<EducationLevel>;
  interestsOverlap?: TagsOverlapFilter;
  locationPreference?: EnumFilter;
  personalityTraits?: EnumFilter;
  lifestyle?: EnumFilter;
}

export interface AgentJobAttributeFilter {
  jobType?: EnumFilter;
  jobCategory?: EnumFilter;
  targetPositions?: TagsOverlapFilter;
  expectedSalary?: RangeFilter;
  workLocation?: EnumFilter;
  workExperience?: EnumFilter;
  skillsOverlap?: TagsOverlapFilter;
  certifications?: EnumFilter;
  education?: EnumFilter<EducationLevel>;
  preferredCompanySize?: EnumFilter;
  availability?: EnumFilter;
}

export interface AgentAdAttributeFilter {
  adType?: EnumFilter;
  productCategory?: EnumFilter;
  targetAudience?: EnumFilter;
  campaignObjective?: EnumFilter;
  budgetRange?: RangeFilter;
  campaignDuration?: EnumFilter;
  keyFeaturesOverlap?: TagsOverlapFilter;
}

export type SceneAttributeFilter =
  | VisionShareAttributeFilter
  | AgentDateAttributeFilter
  | AgentJobAttributeFilter
  | AgentAdAttributeFilter;

export interface AttributeFilterRequest {
  sceneId: SceneId;
  filters: SceneAttributeFilter;
}

export interface AttributeFilterResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// FilterSchema interface
export interface FieldDefinition {
  name: string;
  type: string;
  operators: string[];
  path?: string;
  nullable?: boolean;
  enumValues?: string[];
}

export interface FilterSchema {
  sceneId: string;
  fields: FieldDefinition[];
}

// SCENE_FILTER_SCHEMAS
export const SCENE_FILTER_SCHEMAS: Record<SceneId, FilterSchema> = {
  [SceneId.visionshare]: {
    sceneId: 'visionshare',
    fields: [
      {
        name: 'contentType',
        type: 'enum',
        operators: ['in', 'nin', 'eq', 'ne'],
        enumValues: ['photography', 'illustration', 'design', 'video', '3d', 'other'],
      },
      {
        name: 'purpose',
        type: 'enum',
        operators: ['in', 'nin', 'eq', 'ne'],
        enumValues: ['sell', 'showcase', 'collaborate', 'learn', 'other'],
      },
      {
        name: 'style',
        type: 'enum',
        operators: ['in', 'nin', 'eq', 'ne'],
        enumValues: [
          'realistic',
          'abstract',
          'minimalist',
          'vintage',
          'modern',
          'cartoon',
          'scifi',
          'nature',
          'other',
        ],
      },
      {
        name: 'experienceLevel',
        type: 'enum',
        operators: ['in', 'nin', 'eq', 'ne'],
        enumValues: ['beginner', 'intermediate', 'advanced', 'professional'],
      },
      { name: 'priceRange', type: 'object', operators: ['gte', 'lte', 'gt', 'lt', 'eq'] },
      { name: 'skills', type: 'array', operators: ['contains'] },
    ],
  },
  [SceneId.agentdate]: {
    sceneId: 'agentdate',
    fields: [
      {
        name: 'age',
        type: 'enum',
        operators: ['in', 'nin', 'eq', 'ne'],
        enumValues: [
          'UNDER_18',
          'AGE_18_25',
          'AGE_26_30',
          'AGE_31_35',
          'AGE_36_40',
          'AGE_41_50',
          'OVER_50',
        ],
      },
      {
        name: 'gender',
        type: 'enum',
        operators: ['in', 'nin', 'eq', 'ne'],
        enumValues: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'],
      },
      {
        name: 'maritalStatus',
        type: 'enum',
        operators: ['in', 'nin', 'eq', 'ne'],
        enumValues: ['single', 'married', 'divorced', 'widowed'],
      },
      { name: 'hasChildren', type: 'boolean', operators: ['eq'] },
      { name: 'incomeRange', type: 'object', operators: ['gte', 'lte', 'gt', 'lt', 'eq'] },
      {
        name: 'propertyStatus',
        type: 'enum',
        operators: ['in', 'nin', 'eq', 'ne'],
        enumValues: ['none', 'real_estate', 'vehicle', 'both'],
      },
      {
        name: 'education',
        type: 'enum',
        operators: ['in', 'nin', 'eq', 'ne'],
        enumValues: ['HIGH_SCHOOL', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'DOCTORATE'],
      },
      { name: 'interests', type: 'array', operators: ['contains'] },
      {
        name: 'locationPreference',
        type: 'enum',
        operators: ['in', 'nin', 'eq', 'ne'],
        enumValues: ['same_city', 'same_district', 'anywhere'],
      },
      { name: 'personalityTraits', type: 'enum', operators: ['in', 'nin', 'eq', 'ne'] },
      {
        name: 'lifestyle',
        type: 'enum',
        operators: ['in', 'nin', 'eq', 'ne'],
        enumValues: ['early_bird', 'night_owl', 'balanced', 'flexible'],
      },
    ],
  },
  [SceneId.agentjob]: {
    sceneId: 'agentjob',
    fields: [
      {
        name: 'jobType',
        type: 'enum',
        operators: ['in', 'nin', 'eq', 'ne'],
        enumValues: ['full_time', 'part_time', 'contract', 'freelance', 'internship'],
      },
      {
        name: 'jobCategory',
        type: 'enum',
        operators: ['in', 'nin', 'eq', 'ne'],
        enumValues: [
          'technology',
          'finance',
          'healthcare',
          'education',
          'marketing',
          'design',
          'engineering',
          'other',
        ],
      },
      { name: 'targetPositions', type: 'array', operators: ['contains'] },
      { name: 'expectedSalary', type: 'object', operators: ['gte', 'lte', 'gt', 'lt', 'eq'] },
      {
        name: 'workLocation',
        type: 'enum',
        operators: ['in', 'nin', 'eq', 'ne'],
        enumValues: ['remote', 'onsite', 'hybrid'],
      },
      {
        name: 'workExperience',
        type: 'enum',
        operators: ['in', 'nin', 'eq', 'ne'],
        enumValues: ['entry', 'junior', 'mid', 'senior', 'lead', 'manager', 'director'],
      },
      { name: 'skills', type: 'array', operators: ['contains'] },
      { name: 'certifications', type: 'enum', operators: ['in', 'nin', 'eq', 'ne'] },
      {
        name: 'education',
        type: 'enum',
        operators: ['in', 'nin', 'eq', 'ne'],
        enumValues: ['HIGH_SCHOOL', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'DOCTORATE'],
      },
      {
        name: 'preferredCompanySize',
        type: 'enum',
        operators: ['in', 'nin', 'eq', 'ne'],
        enumValues: ['startup', 'small', 'medium', 'large', 'enterprise'],
      },
      {
        name: 'availability',
        type: 'enum',
        operators: ['in', 'nin', 'eq', 'ne'],
        enumValues: ['immediate', '1_week', '2_weeks', '1_month', '3_months'],
      },
    ],
  },
  [SceneId.agentad]: {
    sceneId: 'agentad',
    fields: [
      {
        name: 'adType',
        type: 'enum',
        operators: ['in', 'nin', 'eq', 'ne'],
        enumValues: ['product', 'service', 'brand', 'event', 'promotion', 'recruitment'],
      },
      {
        name: 'productCategory',
        type: 'enum',
        operators: ['in', 'nin', 'eq', 'ne'],
        enumValues: [
          'electronics',
          'fashion',
          'food',
          'travel',
          'education',
          'health',
          'home',
          'auto',
          'finance',
          'other',
        ],
      },
      {
        name: 'targetAudience',
        type: 'enum',
        operators: ['in', 'nin', 'eq', 'ne'],
        enumValues: [
          'all',
          'young_adults',
          'professionals',
          'parents',
          'seniors',
          'students',
          'business',
        ],
      },
      {
        name: 'campaignObjective',
        type: 'enum',
        operators: ['in', 'nin', 'eq', 'ne'],
        enumValues: ['awareness', 'traffic', 'conversion', 'engagement', 'retention', 'lead_gen'],
      },
      { name: 'budgetRange', type: 'object', operators: ['gte', 'lte', 'gt', 'lt', 'eq'] },
      {
        name: 'campaignDuration',
        type: 'enum',
        operators: ['in', 'nin', 'eq', 'ne'],
        enumValues: ['1_week', '2_weeks', '1_month', '3_months'],
      },
      { name: 'keyFeatures', type: 'array', operators: ['contains'] },
    ],
  },
};

// getFilterSchemaForScene function
export function getFilterSchemaForScene(sceneId: SceneId): FilterSchema {
  return SCENE_FILTER_SCHEMAS[sceneId];
}

// getFilterableFieldsForScene function
export function getFilterableFieldsForScene(sceneId: SceneId): FieldDefinition[] {
  return SCENE_FILTER_SCHEMAS[sceneId]?.fields ?? [];
}

// Credit level type (string literal union)
export type CreditLevel = 'excellent' | 'good' | 'general' | 'poor';

// Credit level thresholds
export const CREDIT_LEVEL_THRESHOLDS: Record<CreditLevel, { min: number; max: number }> = {
  excellent: { min: 900, max: 1000 },
  good: { min: 750, max: 899 },
  general: { min: 600, max: 749 },
  poor: { min: 0, max: 599 },
};

// Keep enum for backward compatibility
export enum CreditLevelEnum {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  GENERAL = 'general',
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

// Real scene configs (inlined so moduleNameMapper can find them)
const SCENE_IDS_LIST = ['visionshare', 'agentdate', 'agentjob', 'agentad'] as const;

function makeVisionShareConfig() {
  return {
    id: 'visionshare' as const,
    metadata: {
      id: 'visionshare',
      name: '视觉分享',
      nameEn: 'VisionShare',
      description: '分享视觉内容',
      icon: '🎨',
      color: '#9C27B0',
      version: '1.0.0',
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    fields: [
      {
        id: 'content_type',
        name: 'contentType',
        label: '内容类型',
        type: 'multiselect',
        required: true,
      },
      { id: 'purpose', name: 'purpose', label: '分享目的', type: 'select', required: true },
      { id: 'style', name: 'style', label: '风格', type: 'multiselect', required: false },
      {
        id: 'portfolio_url',
        name: 'portfolioUrl',
        label: '作品集链接',
        type: 'url',
        required: false,
      },
      { id: 'skills', name: 'skills', label: '相关技能', type: 'tags', required: false },
    ],
    capabilities: [
      {
        id: 'image_upload',
        name: '图片上传',
        description: '图片上传',
        enabled: true,
        version: '1.0.0',
        dependencies: [],
      },
      {
        id: 'video_upload',
        name: '视频上传',
        description: '视频上传',
        enabled: true,
        version: '1.0.0',
        dependencies: [],
        config: { maxFileSize: 524288000, maxDuration: 300 },
      },
      {
        id: 'portfolio_link',
        name: '作品集链接',
        description: '作品集链接',
        enabled: true,
        version: '1.0.0',
        dependencies: [],
      },
      {
        id: 'collaboration',
        name: '协作功能',
        description: '协作',
        enabled: true,
        version: '1.0.0',
        dependencies: ['portfolio_link'],
      },
      {
        id: 'marketplace',
        name: '作品交易',
        description: '交易',
        enabled: false,
        version: '0.5.0',
        dependencies: ['image_upload'],
      },
      {
        id: 'critique_system',
        name: '作品点评',
        description: '点评',
        enabled: true,
        version: '1.0.0',
        dependencies: [],
      },
    ],
    templates: [
      {
        id: 'photographer',
        name: '摄影师',
        description: '专业摄影师模板',
        isPreset: true,
        isDefault: false,
        fieldValues: { contentType: ['photography'] },
      },
      {
        id: 'designer',
        name: '设计师',
        description: '平面设计师模板',
        isPreset: true,
        isDefault: false,
        fieldValues: { contentType: ['design'] },
      },
    ],
    validation: { rules: [], preventSubmitOnError: true, showWarnings: true },
    ui: { sections: [], layout: 'tabs' as const },
  };
}

function makeAgentDateConfig() {
  return {
    id: 'agentdate' as const,
    metadata: {
      id: 'agentdate',
      name: 'Agent约会',
      nameEn: 'AgentDate',
      description: '约会场景',
      icon: '💕',
      color: '#E91E63',
      version: '1.0.0',
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    fields: [
      {
        id: 'dating_purpose',
        name: 'datingPurpose',
        label: '约会目的',
        type: 'select',
        required: true,
      },
      {
        id: 'preferred_gender',
        name: 'preferredGender',
        label: '期望对象性别',
        type: 'select',
        required: true,
      },
      { id: 'age_range', name: 'ageRange', label: '期望年龄范围', type: 'range', required: true },
      {
        id: 'interests',
        name: 'interests',
        label: '兴趣爱好',
        type: 'multiselect',
        required: false,
      },
    ],
    capabilities: [
      {
        id: 'photo_verification',
        name: '照片验证',
        description: '验证',
        enabled: true,
        version: '1.0.0',
        dependencies: [],
      },
      {
        id: 'video_profile',
        name: '视频简介',
        description: '视频',
        enabled: true,
        version: '1.0.0',
        dependencies: [],
      },
      {
        id: 'ice_breakers',
        name: '破冰话题',
        description: '破冰',
        enabled: true,
        version: '1.0.0',
        dependencies: [],
      },
      {
        id: 'date_planning',
        name: '约会规划',
        description: '规划',
        enabled: true,
        version: '1.0.0',
        dependencies: [],
      },
      {
        id: 'safety_check',
        name: '安全检查',
        description: '安全',
        enabled: true,
        version: '1.0.0',
        dependencies: [],
      },
      {
        id: 'compatibility_score',
        name: '匹配度评分',
        description: '匹配',
        enabled: true,
        version: '1.0.0',
        dependencies: [],
      },
    ],
    templates: [
      {
        id: 'serious_dater',
        name: '认真交往',
        description: '寻找长期关系的模板',
        isPreset: true,
        isDefault: false,
        fieldValues: { datingPurpose: 'serious_relationship' },
      },
      {
        id: 'casual_dater',
        name: '轻松约会',
        description: '轻松交友的模板',
        isPreset: true,
        isDefault: true,
        fieldValues: { datingPurpose: 'casual_dating' },
      },
    ],
    validation: { rules: [], preventSubmitOnError: true, showWarnings: true },
    ui: { sections: [], layout: 'tabs' as const },
  };
}

function makeAgentJobConfig() {
  return {
    id: 'agentjob' as const,
    metadata: {
      id: 'agentjob',
      name: 'Agent求职',
      nameEn: 'AgentJob',
      description: '求职场景',
      icon: '💼',
      color: '#2196F3',
      version: '1.0.0',
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    fields: [],
    capabilities: [
      {
        id: 'job_search',
        name: '职位搜索',
        description: '搜索',
        enabled: true,
        version: '1.0.0',
        dependencies: [],
      },
      {
        id: 'resume_builder',
        name: '简历构建',
        description: '简历',
        enabled: true,
        version: '1.0.0',
        dependencies: [],
      },
      {
        id: 'interview_prep',
        name: '面试准备',
        description: '面试',
        enabled: true,
        version: '1.0.0',
        dependencies: [],
      },
    ],
    templates: [],
    validation: { rules: [], preventSubmitOnError: true, showWarnings: true },
    ui: { sections: [], layout: 'tabs' as const },
  };
}

function makeAgentAdConfig() {
  return {
    id: 'agentad' as const,
    metadata: {
      id: 'agentad',
      name: 'Agent广告',
      nameEn: 'AgentAd',
      description: '广告场景',
      icon: '📢',
      color: '#FF9800',
      version: '1.0.0',
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    fields: [],
    capabilities: [
      {
        id: 'campaign_creator',
        name: '广告创建',
        description: '创建',
        enabled: true,
        version: '1.0.0',
        dependencies: [],
      },
      {
        id: 'audience_targeting',
        name: '受众定向',
        description: '定向',
        enabled: true,
        version: '1.0.0',
        dependencies: [],
      },
      {
        id: 'budget_management',
        name: '预算管理',
        description: '预算',
        enabled: true,
        version: '1.0.0',
        dependencies: [],
      },
    ],
    templates: [],
    validation: { rules: [], preventSubmitOnError: true, showWarnings: true },
    ui: { sections: [], layout: 'tabs' as const },
  };
}

const sceneConfigs: Record<string, ReturnType<typeof makeVisionShareConfig>> = {
  visionshare: makeVisionShareConfig(),
  agentdate: makeAgentDateConfig(),
  agentjob: makeAgentJobConfig(),
  agentad: makeAgentAdConfig(),
};

export function getSceneConfig(
  sceneId: string
): ReturnType<typeof makeVisionShareConfig> | undefined {
  return sceneConfigs[sceneId];
}

export function getAllSceneConfigs() {
  return Object.values(sceneConfigs);
}

export function getActiveSceneConfigs() {
  return Object.values(sceneConfigs).filter(c => c.metadata.isActive);
}

export function getSceneInfo(sceneId: string) {
  const config = sceneConfigs[sceneId];
  if (!config) return null;
  return {
    id: config.id,
    name: config.metadata.name,
    description: config.metadata.description,
    icon: config.metadata.icon,
    color: config.metadata.color,
    isActive: config.metadata.isActive,
    fieldCount: config.fields.length,
    capabilityCount: config.capabilities.length,
  };
}

export function hasScene(sceneId: string): boolean {
  return sceneId in sceneConfigs;
}

export const SCENE_IDS: readonly string[] = SCENE_IDS_LIST;

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

export interface PointsTransactionStatsByType {
  type: PointsTransactionType;
  count: number;
  totalAmount: number;
}

export interface PointsStatsResponse {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  frozenAmount: number;
  availableBalance: number;
  byType: PointsTransactionStatsByType[];
  recentStats: {
    dailyEarned: number;
    weeklyEarned: number;
    dailySpent: number;
    weeklySpent: number;
  };
}

export enum ExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
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

// Handoff types
export enum HandoffStatus {
  AGENT_ACTIVE = 'AGENT_ACTIVE',
  HUMAN_ACTIVE = 'HUMAN_ACTIVE',
  PENDING_TAKEOVER = 'PENDING_TAKEOVER',
  PENDING_HANDOFF = 'PENDING_HANDOFF',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
}

export enum HandoffRequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
}

export enum SenderType {
  AGENT = 'AGENT',
  HUMAN = 'HUMAN',
  SYSTEM = 'SYSTEM',
  TRANSITION = 'TRANSITION',
}

export enum HandoffSocketEvents {
  REQUEST_TAKEOVER = 'handoff:request_takeover',
  REQUEST_HANDOFF = 'handoff:request_handoff',
  CONFIRM_HANDOFF = 'handoff:confirm',
  REJECT_HANDOFF = 'handoff:reject',
  CANCEL_HANDOFF = 'handoff:cancel',
  HANDOFF_REQUESTED = 'handoff:requested',
  HANDOFF_CONFIRMED = 'handoff:confirmed',
  HANDOFF_REJECTED = 'handoff:rejected',
  HANDOFF_TIMEOUT = 'handoff:timeout',
  HANDOFF_CANCELLED = 'handoff:cancelled',
  HANDOFF_STATUS_CHANGED = 'handoff:status_changed',
  HANDOFF_ERROR = 'handoff:error',
}

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

// Agent Ad Consumer types
export enum AgentAdRole {
  CONSUMER = 'CONSUMER',
  MERCHANT = 'MERCHANT',
}

export enum HandoffErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_STATUS = 'INVALID_STATUS',
  REQUEST_NOT_FOUND = 'REQUEST_NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  ALREADY_PENDING = 'ALREADY_PENDING',
  FORCE_TAKEOVER_DISABLED = 'FORCE_TAKEOVER_DISABLED',
}

export interface HandoffConfig {
  allowedRoles: string[];
  maxHandoffsPerHour: number;
  minHandoffIntervalSeconds: number;
  allowForcedTakeover: boolean;
  allowedForcedTakeoverRoles: string[];
  auditLogEnabled: boolean;
  requestTimeoutSeconds: number;
}

export const DEFAULT_HANDOFF_CONFIG: HandoffConfig = {
  allowedRoles: ['user', 'admin'],
  maxHandoffsPerHour: 60,
  minHandoffIntervalSeconds: 5,
  allowForcedTakeover: true,
  allowedForcedTakeoverRoles: ['admin'],
  auditLogEnabled: true,
  requestTimeoutSeconds: 30,
};

export interface HandoffAuditLog {
  id: string;
  conversationId: string;
  action:
    | 'REQUEST_TAKEOVER'
    | 'REQUEST_HANDOFF'
    | 'CONFIRM_TAKEOVER'
    | 'CONFIRM_HANDOFF'
    | 'REJECT'
    | 'TIMEOUT'
    | 'CANCEL'
    | 'FORCE_TAKEOVER';
  performedBy: string;
  performedAt: string;
  metadata?: Record<string, any>;
}

// L1 Profile Types
export enum VisibilityLevel {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  MATCHED_ONLY = 'MATCHED_ONLY',
  VERIFIED_ONLY = 'VERIFIED_ONLY',
}

// Location Types
export interface Location {
  province: string;
  provinceName: string;
  city: string;
  cityName: string;
  district?: string;
  districtName?: string;
  address?: string;
  postalCode?: string;
}

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
}

export interface DistanceFilter {
  center: GeoCoordinates;
  radiusKm: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface GeoFence {
  id: string;
  name: string;
  description?: string;
  geometry: { type: 'Polygon'; coordinates: Array<Array<[number, number]>> };
  createdAt: Date;
  updatedAt: Date;
}

export interface GeoFenceCheckResult {
  inside: boolean;
  distanceMeters?: number;
  nearestPoint?: GeoCoordinates;
}

export interface LocationFilter {
  province?: string;
  city?: string;
  district?: string;
  withinRadius?: DistanceFilter;
  withinBounds?: BoundingBox;
  withinFence?: string;
}

export interface LocationSearchRequest {
  query?: string;
  filter?: LocationFilter;
  page?: number;
  limit?: number;
}

export interface LocationSearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface DistanceResult {
  distanceKm: number;
  distanceMiles: number;
  distanceMeters: number;
}

export const EARTH_RADIUS_KM = 6371;

// Geo Utilities
export function calculateDistance(coord1: GeoCoordinates, coord2: GeoCoordinates): DistanceResult {
  const R = 6371;
  const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const dLng = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
  const lat1 = (coord1.latitude * Math.PI) / 180;
  const lat2 = (coord2.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  return {
    distanceKm,
    distanceMiles: distanceKm * 0.621371,
    distanceMeters: distanceKm * 1000,
  };
}

export function isWithinRadius(
  point: GeoCoordinates,
  center: GeoCoordinates,
  radiusKm: number
): boolean {
  return calculateDistance(point, center).distanceKm <= radiusKm;
}

export function isValidCoordinates(coords: GeoCoordinates): boolean {
  return (
    coords.latitude >= -90 &&
    coords.latitude <= 90 &&
    coords.longitude >= -180 &&
    coords.longitude <= 180
  );
}

export function createBoundingBox(center: GeoCoordinates, radiusKm: number): BoundingBox {
  const latDelta = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI);
  const lngDelta =
    ((radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI)) / Math.cos((center.latitude * Math.PI) / 180);

  return {
    minLat: center.latitude - latDelta,
    maxLat: center.latitude + latDelta,
    minLng: center.longitude - lngDelta,
    maxLng: center.longitude + lngDelta,
  };
}

export function isWithinBoundingBox(point: GeoCoordinates, box: BoundingBox): boolean {
  return (
    point.latitude >= box.minLat &&
    point.latitude <= box.maxLat &&
    point.longitude >= box.minLng &&
    point.longitude <= box.maxLng
  );
}

export function isPointInPolygon(
  point: GeoCoordinates,
  polygon: { coordinates: Array<Array<[number, number]>> }
): boolean {
  const coordinates = polygon.coordinates[0];
  const x = point.longitude;
  const y = point.latitude;

  let inside = false;
  for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
    const xi = coordinates[i][0];
    const yi = coordinates[i][1];
    const xj = coordinates[j][0];
    const yj = coordinates[j][1];

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function calculatePolygonCentroid(polygon: {
  coordinates: Array<Array<[number, number]>>;
}): GeoCoordinates {
  const coordinates = polygon.coordinates[0];
  let sumX = 0,
    sumY = 0;
  for (const coord of coordinates) {
    sumX += coord[0];
    sumY += coord[1];
  }
  return {
    latitude: sumY / coordinates.length,
    longitude: sumX / coordinates.length,
  };
}

export function toGeoJSONPoint(coords: GeoCoordinates): {
  type: 'Point';
  coordinates: [number, number];
} {
  return { type: 'Point', coordinates: [coords.longitude, coords.latitude] };
}

export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)}米`;
  const km = distanceMeters / 1000;
  if (km < 10) return `${km.toFixed(1)}公里`;
  return `${Math.round(km)}公里`;
}

// Geo-fencing functions (mock implementations)
export function checkGeoFence(_point: GeoCoordinates, _fenceId: string): GeoFenceCheckResult {
  return { inside: false };
}

export function findContainingGeoFences(_point: GeoCoordinates): GeoFence[] {
  return [];
}

export function getGeoFencesWithinDistance(
  _point: GeoCoordinates,
  _maxDistanceKm: number
): Array<{ fence: GeoFence; distanceKm: number }> {
  return [];
}

// ============================================
// Agent Profile L1/L2/L3 Types
// ============================================

export enum AgeRange {
  UNDER_18 = 'UNDER_18',
  AGE_18_25 = 'AGE_18_25',
  AGE_26_30 = 'AGE_26_30',
  AGE_31_35 = 'AGE_31_35',
  AGE_36_40 = 'AGE_36_40',
  AGE_41_45 = 'AGE_41_45',
  AGE_46_50 = 'AGE_46_50',
  AGE_51_60 = 'AGE_51_60',
  OVER_60 = 'OVER_60',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export enum EducationLevel {
  HIGH_SCHOOL = 'HIGH_SCHOOL',
  ASSOCIATE = 'ASSOCIATE',
  BACHELOR = 'BACHELOR',
  MASTER = 'MASTER',
  DOCTORATE = 'DOCTORATE',
  OTHER = 'OTHER',
  NO_REQUIREMENT = 'NO_REQUIREMENT',
}

export interface ProfileLocation {
  province: string;
  city: string;
  district?: string;
  latitude?: number;
  longitude?: number;
}

export interface L1Profile {
  age?: AgeRange;
  gender?: Gender;
  location?: ProfileLocation;
  occupation?: string;
  education?: EducationLevel;
  [key: string]: any;
}

export const L1_FIELD_WEIGHTS: Record<keyof L1Profile, number> = {
  age: 20,
  gender: 15,
  location: 25,
  occupation: 20,
  education: 20,
};

export const L1_FIELD_LABELS: Record<keyof L1Profile, string> = {
  age: '年龄段',
  gender: '性别',
  location: '所在地',
  occupation: '职业',
  education: '教育水平',
};

export const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  [AgeRange.UNDER_18]: '18岁以下',
  [AgeRange.AGE_18_25]: '18-25岁',
  [AgeRange.AGE_26_30]: '26-30岁',
  [AgeRange.AGE_31_35]: '31-35岁',
  [AgeRange.AGE_36_40]: '36-40岁',
  [AgeRange.AGE_41_45]: '41-45岁',
  [AgeRange.AGE_46_50]: '46-50岁',
  [AgeRange.AGE_51_60]: '51-60岁',
  [AgeRange.OVER_60]: '60岁以上',
};

export const GENDER_LABELS: Record<Gender, string> = {
  [Gender.MALE]: '男',
  [Gender.FEMALE]: '女',
  [Gender.OTHER]: '其他',
  [Gender.PREFER_NOT_TO_SAY]: '保密',
};

export const EDUCATION_LABELS: Record<EducationLevel, string> = {
  [EducationLevel.HIGH_SCHOOL]: '高中及以下',
  [EducationLevel.ASSOCIATE]: '大专',
  [EducationLevel.BACHELOR]: '本科',
  [EducationLevel.MASTER]: '硕士',
  [EducationLevel.DOCTORATE]: '博士',
  [EducationLevel.OTHER]: '其他',
  [EducationLevel.NO_REQUIREMENT]: '不限',
};

export interface L2Profile {
  description?: string;
  requirements?: string[];
  capabilities?: string[];
  preferences?: string[];
  constraints?: string[];
  [key: string]: any;
}

export interface L3Profile {
  description: string;
  mediaUrls?: string[];
}

export interface AgentProfileData {
  l1?: L1Profile;
  l2?: L2Profile;
  l3?: L3Profile;
}

export interface ProfileCompletionResult {
  l1Percentage: number;
  l1FilledFields: number;
  l1TotalFields: number;
  l1MissingFields: (keyof L1Profile)[];
  l1WeightedScore: number;
}

export interface ProfileValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ProfileValidationResult {
  valid: boolean;
  errors: ProfileValidationError[];
}

export interface UpdateL1ProfileRequest {
  age?: AgeRange;
  gender?: Gender;
  location?: ProfileLocation;
  occupation?: string;
  education?: EducationLevel;
}

export interface UpdateL2ProfileRequest {
  description?: string;
  requirements?: string[];
  capabilities?: string[];
  preferences?: string[];
  constraints?: string[];
}

export interface UpdateL3ProfileRequest {
  description: string;
  mediaUrls?: string[];
}

export interface AgentProfileData {
  l1?: L1Profile;
  l2?: L2Profile;
  l3?: L3Profile;
}

export interface ProfileValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ProfileValidationResult {
  valid: boolean;
  errors: ProfileValidationError[];
}

export interface AgentProfile {
  id: string;
  agentId: string;
  sceneId?: string;
  l1Data: L1Profile | null;
  l2Data: L2Profile | null;
  l3Description: string | null;
  sceneConfig: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── L2 Schema mocks ─────────────────────────────────────────────────────────

export interface L2SchemaField {
  id: string;
  type: string;
  label: string;
  description?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  minLength?: number;
  maxLength?: number;
  maxItems?: number;
  unit?: string;
  placeholder?: string;
  defaultValue?: unknown;
  dependsOn?: string;
  showWhen?: { field: string; operator: string; value: unknown };
  validation?: { pattern?: string; message?: string };
}

export interface L2Schema {
  id: string;
  version: string;
  scene: string;
  role?: string;
  title: string;
  description?: string;
  fields: L2SchemaField[];
  groups?: Array<{ id: string; title: string; fields: string[] }>;
}

export const L2_SCHEMAS: Record<string, L2Schema> = {};

export function getL2Schema(_scene: string, _role?: string): L2Schema | undefined {
  return undefined;
}

export function getAllL2Schemas(): L2Schema[] {
  return [];
}

export function getL2SchemaIds(): string[] {
  return [];
}
