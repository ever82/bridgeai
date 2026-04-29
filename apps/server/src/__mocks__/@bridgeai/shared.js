/**
 * Mock for @bridgeai/shared
 *
 * Note: This mock provides stub types/functions for tests that don't need
 * the real module. Tests requiring real L2 schema functions should use
 * jest.requireActual('@bridgeai/shared') to bypass this mock.
 */
// Disclosure Level Types
export var DisclosureLevel;
(function (DisclosureLevel) {
    DisclosureLevel["PUBLIC"] = "PUBLIC";
    DisclosureLevel["AFTER_MATCH"] = "AFTER_MATCH";
    DisclosureLevel["AFTER_CHAT"] = "AFTER_CHAT";
    DisclosureLevel["AFTER_REFERRAL"] = "AFTER_REFERRAL";
})(DisclosureLevel || (DisclosureLevel = {}));
export var RelationshipStage;
(function (RelationshipStage) {
    RelationshipStage["NONE"] = "NONE";
    RelationshipStage["MATCHED"] = "MATCHED";
    RelationshipStage["CHATTED"] = "CHATTED";
    RelationshipStage["REFERRED"] = "REFERRED";
})(RelationshipStage || (RelationshipStage = {}));
export var SceneCode;
(function (SceneCode) {
    SceneCode["VISION_SHARE"] = "vision_share";
    SceneCode["AGENT_DATE"] = "agent_date";
    SceneCode["AGENT_JOB"] = "agent_job";
    SceneCode["AGENT_AD"] = "agent_ad";
})(SceneCode || (SceneCode = {}));
export var PointsTransactionType;
(function (PointsTransactionType) {
    PointsTransactionType["EARN"] = "EARN";
    PointsTransactionType["SPEND"] = "SPEND";
    PointsTransactionType["FROZEN"] = "FROZEN";
    PointsTransactionType["UNFROZEN"] = "UNFROZEN";
    PointsTransactionType["TRANSFER_IN"] = "TRANSFER_IN";
    PointsTransactionType["TRANSFER_OUT"] = "TRANSFER_OUT";
})(PointsTransactionType || (PointsTransactionType = {}));
export var FreezeStatus;
(function (FreezeStatus) {
    FreezeStatus["FROZEN"] = "FROZEN";
    FreezeStatus["RELEASED"] = "RELEASED";
    FreezeStatus["USED"] = "USED";
})(FreezeStatus || (FreezeStatus = {}));
export const DISCLOSURE_LEVEL_INFO = {
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
export const DEFAULT_FIELD_DISCLOSURES = [
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
export function getRequiredStage(level) {
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
export function canDiscloseAtStage(requiredLevel, currentStage) {
    const requiredStage = getRequiredStage(requiredLevel);
    const stageOrder = {
        [RelationshipStage.NONE]: 0,
        [RelationshipStage.MATCHED]: 1,
        [RelationshipStage.CHATTED]: 2,
        [RelationshipStage.REFERRED]: 3,
    };
    return stageOrder[currentStage] >= stageOrder[requiredStage];
}
export function createDefaultDisclosureSettings(agentId, userId) {
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
export const isAndFilter = (expr) => 'and' in expr && Array.isArray(expr.and);
export const isOrFilter = (expr) => 'or' in expr && Array.isArray(expr.or);
export const isNotFilter = (expr) => 'not' in expr && !Array.isArray(expr.not);
export const isFilterCondition = (expr) => 'field' in expr && 'operator' in expr && 'value' in expr;
// SceneId enum
export var SceneId;
(function (SceneId) {
    SceneId["visionshare"] = "visionshare";
    SceneId["agentdate"] = "agentdate";
    SceneId["agentjob"] = "agentjob";
    SceneId["agentad"] = "agentad";
})(SceneId || (SceneId = {}));
// SCENE_FILTER_SCHEMAS
export const SCENE_FILTER_SCHEMAS = {
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
export function getFilterSchemaForScene(sceneId) {
    return SCENE_FILTER_SCHEMAS[sceneId];
}
// getFilterableFieldsForScene function
export function getFilterableFieldsForScene(sceneId) {
    return SCENE_FILTER_SCHEMAS[sceneId]?.fields ?? [];
}
// Credit level thresholds
export const CREDIT_LEVEL_THRESHOLDS = {
    excellent: { min: 900, max: 1000 },
    good: { min: 750, max: 899 },
    general: { min: 600, max: 749 },
    poor: { min: 0, max: 599 },
};
// Keep enum for backward compatibility
export var CreditLevelEnum;
(function (CreditLevelEnum) {
    CreditLevelEnum["EXCELLENT"] = "excellent";
    CreditLevelEnum["GOOD"] = "good";
    CreditLevelEnum["GENERAL"] = "general";
    CreditLevelEnum["POOR"] = "poor";
})(CreditLevelEnum || (CreditLevelEnum = {}));
export var CreditFactorType;
(function (CreditFactorType) {
    CreditFactorType["PROFILE"] = "profile";
    CreditFactorType["BEHAVIOR"] = "behavior";
    CreditFactorType["TRANSACTION"] = "transaction";
    CreditFactorType["SOCIAL"] = "social";
})(CreditFactorType || (CreditFactorType = {}));
// Agent Message Protocol exports
export var AgentMessageType;
(function (AgentMessageType) {
    AgentMessageType["DIRECT"] = "direct";
    AgentMessageType["GROUP"] = "group";
    AgentMessageType["SYSTEM"] = "system";
    AgentMessageType["COMMAND"] = "command";
    AgentMessageType["RESPONSE"] = "response";
    AgentMessageType["STATUS"] = "status";
    AgentMessageType["ERROR"] = "error";
})(AgentMessageType || (AgentMessageType = {}));
export var AgentType;
(function (AgentType) {
    AgentType["PERSONAL"] = "personal";
    AgentType["BUSINESS"] = "business";
    AgentType["SERVICE"] = "service";
    AgentType["SYSTEM"] = "system";
})(AgentType || (AgentType = {}));
export var MessagePriority;
(function (MessagePriority) {
    MessagePriority[MessagePriority["LOW"] = 1] = "LOW";
    MessagePriority[MessagePriority["NORMAL"] = 2] = "NORMAL";
    MessagePriority[MessagePriority["HIGH"] = 3] = "HIGH";
    MessagePriority[MessagePriority["URGENT"] = 4] = "URGENT";
})(MessagePriority || (MessagePriority = {}));
export var AgentProtocolErrorCode;
(function (AgentProtocolErrorCode) {
    AgentProtocolErrorCode["INVALID_FORMAT"] = "INVALID_FORMAT";
    AgentProtocolErrorCode["UNSUPPORTED_VERSION"] = "UNSUPPORTED_VERSION";
    AgentProtocolErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    AgentProtocolErrorCode["RATE_LIMITED"] = "RATE_LIMITED";
    AgentProtocolErrorCode["CONTENT_VIOLATION"] = "CONTENT_VIOLATION";
    AgentProtocolErrorCode["RECIPIENT_NOT_FOUND"] = "RECIPIENT_NOT_FOUND";
    AgentProtocolErrorCode["MESSAGE_EXPIRED"] = "MESSAGE_EXPIRED";
    AgentProtocolErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
})(AgentProtocolErrorCode || (AgentProtocolErrorCode = {}));
export const PROTOCOL_VERSION = '1.0.0';
export function validateAgentMessage(_message) {
    return { valid: true, errors: [] };
}
export function createAgentMessage(params) {
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
export function isVersionCompatible(version) {
    return version.startsWith('1.');
}
// Real scene configs (inlined so moduleNameMapper can find them)
const SCENE_IDS_LIST = ['visionshare', 'agentdate', 'agentjob', 'agentad'];
function makeVisionShareConfig() {
    return {
        id: 'visionshare',
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
        ui: { sections: [], layout: 'tabs' },
    };
}
function makeAgentDateConfig() {
    return {
        id: 'agentdate',
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
        ui: { sections: [], layout: 'tabs' },
    };
}
function makeAgentJobConfig() {
    return {
        id: 'agentjob',
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
        ui: { sections: [], layout: 'tabs' },
    };
}
function makeAgentAdConfig() {
    return {
        id: 'agentad',
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
        ui: { sections: [], layout: 'tabs' },
    };
}
const sceneConfigs = {
    visionshare: makeVisionShareConfig(),
    agentdate: makeAgentDateConfig(),
    agentjob: makeAgentJobConfig(),
    agentad: makeAgentAdConfig(),
};
export function getSceneConfig(sceneId) {
    return sceneConfigs[sceneId];
}
export function getAllSceneConfigs() {
    return Object.values(sceneConfigs);
}
export function getActiveSceneConfigs() {
    return Object.values(sceneConfigs).filter(c => c.metadata.isActive);
}
export function getSceneInfo(sceneId) {
    const config = sceneConfigs[sceneId];
    if (!config)
        return null;
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
export function hasScene(sceneId) {
    return sceneId in sceneConfigs;
}
export const SCENE_IDS = SCENE_IDS_LIST;
export function serializeMessage(message) {
    return JSON.stringify(message);
}
export function parseMessage(json) {
    try {
        return JSON.parse(json);
    }
    catch {
        return null;
    }
}
// Points types
(function (SceneCode) {
    SceneCode["VISION_SHARE"] = "vision_share";
    SceneCode["AGENT_DATE"] = "agent_date";
    SceneCode["AGENT_JOB"] = "agent_job";
    SceneCode["AGENT_AD"] = "agent_ad";
})(SceneCode || (SceneCode = {}));
(function (PointsTransactionType) {
    PointsTransactionType["EARN"] = "EARN";
    PointsTransactionType["SPEND"] = "SPEND";
    PointsTransactionType["FROZEN"] = "FROZEN";
    PointsTransactionType["UNFROZEN"] = "UNFROZEN";
    PointsTransactionType["TRANSFER_IN"] = "TRANSFER_IN";
    PointsTransactionType["TRANSFER_OUT"] = "TRANSFER_OUT";
})(PointsTransactionType || (PointsTransactionType = {}));
(function (FreezeStatus) {
    FreezeStatus["FROZEN"] = "FROZEN";
    FreezeStatus["RELEASED"] = "RELEASED";
    FreezeStatus["USED"] = "USED";
    FreezeStatus["EXPIRED"] = "EXPIRED";
})(FreezeStatus || (FreezeStatus = {}));
export var ExportFormat;
(function (ExportFormat) {
    ExportFormat["CSV"] = "csv";
    ExportFormat["XLSX"] = "xlsx";
})(ExportFormat || (ExportFormat = {}));
// Dating types for AgentDate extractor
export var PersonalityTrait;
(function (PersonalityTrait) {
    PersonalityTrait["INTROVERTED"] = "INTROVERTED";
    PersonalityTrait["EXTROVERTED"] = "EXTROVERTED";
    PersonalityTrait["AMBIVERT"] = "AMBIVERT";
    PersonalityTrait["OPTIMISTIC"] = "OPTIMISTIC";
    PersonalityTrait["RATIONAL"] = "RATIONAL";
    PersonalityTrait["EMOTIONAL"] = "EMOTIONAL";
    PersonalityTrait["PRACTICAL"] = "PRACTICAL";
    PersonalityTrait["CREATIVE"] = "CREATIVE";
    PersonalityTrait["ADVENTUROUS"] = "ADVENTUROUS";
    PersonalityTrait["STABLE"] = "STABLE";
    PersonalityTrait["HUMOROUS"] = "HUMOROUS";
    PersonalityTrait["GENTLE"] = "GENTLE";
    PersonalityTrait["INDEPENDENT"] = "INDEPENDENT";
    PersonalityTrait["DEPENDABLE"] = "DEPENDABLE";
})(PersonalityTrait || (PersonalityTrait = {}));
export var InterestCategory;
(function (InterestCategory) {
    InterestCategory["SPORTS"] = "SPORTS";
    InterestCategory["MUSIC"] = "MUSIC";
    InterestCategory["READING"] = "READING";
    InterestCategory["TRAVEL"] = "TRAVEL";
    InterestCategory["FOOD"] = "FOOD";
    InterestCategory["MOVIES"] = "MOVIES";
    InterestCategory["GAMING"] = "GAMING";
    InterestCategory["PHOTOGRAPHY"] = "PHOTOGRAPHY";
    InterestCategory["ARTS"] = "ARTS";
    InterestCategory["TECH"] = "TECH";
    InterestCategory["FASHION"] = "FASHION";
    InterestCategory["OUTDOOR"] = "OUTDOOR";
    InterestCategory["PETS"] = "PETS";
    InterestCategory["COOKING"] = "COOKING";
    InterestCategory["DANCING"] = "DANCING";
    InterestCategory["FITNESS"] = "FITNESS";
})(InterestCategory || (InterestCategory = {}));
export var DatingPurpose;
(function (DatingPurpose) {
    DatingPurpose["SERIOUS_RELATIONSHIP"] = "SERIOUS_RELATIONSHIP";
    DatingPurpose["MARRIAGE"] = "MARRIAGE";
    DatingPurpose["CASUAL_DATING"] = "CASUAL_DATING";
    DatingPurpose["FRIENDSHIP_FIRST"] = "FRIENDSHIP_FIRST";
    DatingPurpose["COMPANIONSHIP"] = "COMPANIONSHIP";
    DatingPurpose["NOT_SURE"] = "NOT_SURE";
})(DatingPurpose || (DatingPurpose = {}));
// Handoff types
export var HandoffStatus;
(function (HandoffStatus) {
    HandoffStatus["AGENT_ACTIVE"] = "AGENT_ACTIVE";
    HandoffStatus["HUMAN_ACTIVE"] = "HUMAN_ACTIVE";
    HandoffStatus["PENDING_TAKEOVER"] = "PENDING_TAKEOVER";
    HandoffStatus["PENDING_HANDOFF"] = "PENDING_HANDOFF";
    HandoffStatus["TIMEOUT"] = "TIMEOUT";
    HandoffStatus["CANCELLED"] = "CANCELLED";
})(HandoffStatus || (HandoffStatus = {}));
export var HandoffRequestStatus;
(function (HandoffRequestStatus) {
    HandoffRequestStatus["PENDING"] = "PENDING";
    HandoffRequestStatus["ACCEPTED"] = "ACCEPTED";
    HandoffRequestStatus["REJECTED"] = "REJECTED";
    HandoffRequestStatus["TIMEOUT"] = "TIMEOUT";
    HandoffRequestStatus["CANCELLED"] = "CANCELLED";
})(HandoffRequestStatus || (HandoffRequestStatus = {}));
export var SenderType;
(function (SenderType) {
    SenderType["AGENT"] = "AGENT";
    SenderType["HUMAN"] = "HUMAN";
    SenderType["SYSTEM"] = "SYSTEM";
    SenderType["TRANSITION"] = "TRANSITION";
})(SenderType || (SenderType = {}));
export var HandoffSocketEvents;
(function (HandoffSocketEvents) {
    HandoffSocketEvents["REQUEST_TAKEOVER"] = "handoff:request_takeover";
    HandoffSocketEvents["REQUEST_HANDOFF"] = "handoff:request_handoff";
    HandoffSocketEvents["CONFIRM_HANDOFF"] = "handoff:confirm";
    HandoffSocketEvents["REJECT_HANDOFF"] = "handoff:reject";
    HandoffSocketEvents["CANCEL_HANDOFF"] = "handoff:cancel";
    HandoffSocketEvents["HANDOFF_REQUESTED"] = "handoff:requested";
    HandoffSocketEvents["HANDOFF_CONFIRMED"] = "handoff:confirmed";
    HandoffSocketEvents["HANDOFF_REJECTED"] = "handoff:rejected";
    HandoffSocketEvents["HANDOFF_TIMEOUT"] = "handoff:timeout";
    HandoffSocketEvents["HANDOFF_CANCELLED"] = "handoff:cancelled";
    HandoffSocketEvents["HANDOFF_STATUS_CHANGED"] = "handoff:status_changed";
    HandoffSocketEvents["HANDOFF_ERROR"] = "handoff:error";
})(HandoffSocketEvents || (HandoffSocketEvents = {}));
// Agent Ad Consumer types
export var AgentAdRole;
(function (AgentAdRole) {
    AgentAdRole["CONSUMER"] = "CONSUMER";
    AgentAdRole["MERCHANT"] = "MERCHANT";
})(AgentAdRole || (AgentAdRole = {}));
export var HandoffErrorCode;
(function (HandoffErrorCode) {
    HandoffErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    HandoffErrorCode["RATE_LIMITED"] = "RATE_LIMITED";
    HandoffErrorCode["INVALID_STATUS"] = "INVALID_STATUS";
    HandoffErrorCode["REQUEST_NOT_FOUND"] = "REQUEST_NOT_FOUND";
    HandoffErrorCode["TIMEOUT"] = "TIMEOUT";
    HandoffErrorCode["ALREADY_PENDING"] = "ALREADY_PENDING";
    HandoffErrorCode["FORCE_TAKEOVER_DISABLED"] = "FORCE_TAKEOVER_DISABLED";
})(HandoffErrorCode || (HandoffErrorCode = {}));
export const DEFAULT_HANDOFF_CONFIG = {
    allowedRoles: ['user', 'admin'],
    maxHandoffsPerHour: 60,
    minHandoffIntervalSeconds: 5,
    allowForcedTakeover: true,
    allowedForcedTakeoverRoles: ['admin'],
    auditLogEnabled: true,
    requestTimeoutSeconds: 30,
};
// L1 Profile Types
export var VisibilityLevel;
(function (VisibilityLevel) {
    VisibilityLevel["PUBLIC"] = "PUBLIC";
    VisibilityLevel["PRIVATE"] = "PRIVATE";
    VisibilityLevel["MATCHED_ONLY"] = "MATCHED_ONLY";
    VisibilityLevel["VERIFIED_ONLY"] = "VERIFIED_ONLY";
})(VisibilityLevel || (VisibilityLevel = {}));
export const EARTH_RADIUS_KM = 6371;
// Geo Utilities
export function calculateDistance(coord1, coord2) {
    const R = 6371;
    const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const dLng = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;
    const lat1 = (coord1.latitude * Math.PI) / 180;
    const lat2 = (coord2.latitude * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;
    return {
        distanceKm,
        distanceMiles: distanceKm * 0.621371,
        distanceMeters: distanceKm * 1000,
    };
}
export function isWithinRadius(point, center, radiusKm) {
    return calculateDistance(point, center).distanceKm <= radiusKm;
}
export function isValidCoordinates(coords) {
    return (coords.latitude >= -90 &&
        coords.latitude <= 90 &&
        coords.longitude >= -180 &&
        coords.longitude <= 180);
}
export function createBoundingBox(center, radiusKm) {
    const latDelta = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI);
    const lngDelta = ((radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI)) / Math.cos((center.latitude * Math.PI) / 180);
    return {
        minLat: center.latitude - latDelta,
        maxLat: center.latitude + latDelta,
        minLng: center.longitude - lngDelta,
        maxLng: center.longitude + lngDelta,
    };
}
export function isWithinBoundingBox(point, box) {
    return (point.latitude >= box.minLat &&
        point.latitude <= box.maxLat &&
        point.longitude >= box.minLng &&
        point.longitude <= box.maxLng);
}
export function isPointInPolygon(point, polygon) {
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
        if (intersect)
            inside = !inside;
    }
    return inside;
}
export function calculatePolygonCentroid(polygon) {
    const coordinates = polygon.coordinates[0];
    let sumX = 0, sumY = 0;
    for (const coord of coordinates) {
        sumX += coord[0];
        sumY += coord[1];
    }
    return {
        latitude: sumY / coordinates.length,
        longitude: sumX / coordinates.length,
    };
}
export function toGeoJSONPoint(coords) {
    return { type: 'Point', coordinates: [coords.longitude, coords.latitude] };
}
export function formatDistance(distanceMeters) {
    if (distanceMeters < 1000)
        return `${Math.round(distanceMeters)}米`;
    const km = distanceMeters / 1000;
    if (km < 10)
        return `${km.toFixed(1)}公里`;
    return `${Math.round(km)}公里`;
}
// Geo-fencing functions (mock implementations)
export function checkGeoFence(_point, _fenceId) {
    return { inside: false };
}
export function findContainingGeoFences(_point) {
    return [];
}
export function getGeoFencesWithinDistance(_point, _maxDistanceKm) {
    return [];
}
// ============================================
// Agent Profile L1/L2/L3 Types
// ============================================
export var AgeRange;
(function (AgeRange) {
    AgeRange["UNDER_18"] = "UNDER_18";
    AgeRange["AGE_18_25"] = "AGE_18_25";
    AgeRange["AGE_26_30"] = "AGE_26_30";
    AgeRange["AGE_31_35"] = "AGE_31_35";
    AgeRange["AGE_36_40"] = "AGE_36_40";
    AgeRange["AGE_41_45"] = "AGE_41_45";
    AgeRange["AGE_46_50"] = "AGE_46_50";
    AgeRange["AGE_51_60"] = "AGE_51_60";
    AgeRange["OVER_60"] = "OVER_60";
})(AgeRange || (AgeRange = {}));
export var Gender;
(function (Gender) {
    Gender["MALE"] = "MALE";
    Gender["FEMALE"] = "FEMALE";
    Gender["OTHER"] = "OTHER";
    Gender["PREFER_NOT_TO_SAY"] = "PREFER_NOT_TO_SAY";
})(Gender || (Gender = {}));
export var EducationLevel;
(function (EducationLevel) {
    EducationLevel["HIGH_SCHOOL"] = "HIGH_SCHOOL";
    EducationLevel["ASSOCIATE"] = "ASSOCIATE";
    EducationLevel["BACHELOR"] = "BACHELOR";
    EducationLevel["MASTER"] = "MASTER";
    EducationLevel["DOCTORATE"] = "DOCTORATE";
    EducationLevel["OTHER"] = "OTHER";
    EducationLevel["NO_REQUIREMENT"] = "NO_REQUIREMENT";
})(EducationLevel || (EducationLevel = {}));
export const L1_FIELD_WEIGHTS = {
    age: 20,
    gender: 15,
    location: 25,
    occupation: 20,
    education: 20,
};
export const L1_FIELD_LABELS = {
    age: '年龄段',
    gender: '性别',
    location: '所在地',
    occupation: '职业',
    education: '教育水平',
};
export const AGE_RANGE_LABELS = {
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
export const GENDER_LABELS = {
    [Gender.MALE]: '男',
    [Gender.FEMALE]: '女',
    [Gender.OTHER]: '其他',
    [Gender.PREFER_NOT_TO_SAY]: '保密',
};
export const EDUCATION_LABELS = {
    [EducationLevel.HIGH_SCHOOL]: '高中及以下',
    [EducationLevel.ASSOCIATE]: '大专',
    [EducationLevel.BACHELOR]: '本科',
    [EducationLevel.MASTER]: '硕士',
    [EducationLevel.DOCTORATE]: '博士',
    [EducationLevel.OTHER]: '其他',
    [EducationLevel.NO_REQUIREMENT]: '不限',
};
export const L2_SCHEMAS = {};
export function getL2Schema(_scene, _role) {
    return undefined;
}
export function getAllL2Schemas() {
    return [];
}
export function getL2SchemaIds() {
    return [];
}
// ============================================
// Dating Profile Types (DATE002)
// ============================================
export var AgeRangePreference;
(function (AgeRangePreference) {
    AgeRangePreference["UNDER_20"] = "UNDER_20";
    AgeRangePreference["AGE_20_25"] = "AGE_20_25";
    AgeRangePreference["AGE_26_30"] = "AGE_26_30";
    AgeRangePreference["AGE_31_35"] = "AGE_31_35";
    AgeRangePreference["AGE_36_40"] = "AGE_36_40";
    AgeRangePreference["AGE_41_50"] = "AGE_41_50";
    AgeRangePreference["OVER_50"] = "OVER_50";
    AgeRangePreference["NO_PREFERENCE"] = "NO_PREFERENCE";
})(AgeRangePreference || (AgeRangePreference = {}));
export var HeightRange;
(function (HeightRange) {
    HeightRange["BELOW_150"] = "BELOW_150";
    HeightRange["HEIGHT_150_160"] = "HEIGHT_150_160";
    HeightRange["HEIGHT_160_170"] = "HEIGHT_160_170";
    HeightRange["HEIGHT_170_180"] = "HEIGHT_170_180";
    HeightRange["HEIGHT_180_190"] = "HEIGHT_180_190";
    HeightRange["ABOVE_190"] = "ABOVE_190";
    HeightRange["NO_PREFERENCE"] = "NO_PREFERENCE";
})(HeightRange || (HeightRange = {}));
export var IncomeRange;
(function (IncomeRange) {
    IncomeRange["BELOW_5K"] = "BELOW_5K";
    IncomeRange["INCOME_5K_10K"] = "INCOME_5K_10K";
    IncomeRange["INCOME_10K_20K"] = "INCOME_10K_20K";
    IncomeRange["INCOME_20K_50K"] = "INCOME_20K_50K";
    IncomeRange["ABOVE_50K"] = "ABOVE_50K";
    IncomeRange["NO_PREFERENCE"] = "NO_PREFERENCE";
})(IncomeRange || (IncomeRange = {}));
export var MBTIType;
(function (MBTIType) {
    MBTIType["INTJ"] = "INTJ";
    MBTIType["INTP"] = "INTP";
    MBTIType["ENTJ"] = "ENTJ";
    MBTIType["ENTP"] = "ENTP";
    MBTIType["INFJ"] = "INFJ";
    MBTIType["INFP"] = "INFP";
    MBTIType["ENFJ"] = "ENFJ";
    MBTIType["ENFP"] = "ENFP";
    MBTIType["ISTJ"] = "ISTJ";
    MBTIType["ISFJ"] = "ISFJ";
    MBTIType["ESTJ"] = "ESTJ";
    MBTIType["ESFJ"] = "ESFJ";
    MBTIType["ISTP"] = "ISTP";
    MBTIType["ISFP"] = "ISFP";
    MBTIType["ESTP"] = "ESTP";
    MBTIType["ESFP"] = "ESFP";
    MBTIType["NO_PREFERENCE"] = "NO_PREFERENCE";
})(MBTIType || (MBTIType = {}));
export var SleepSchedule;
(function (SleepSchedule) {
    SleepSchedule["EARLY_BIRD"] = "EARLY_BIRD";
    SleepSchedule["NIGHT_OWL"] = "NIGHT_OWL";
    SleepSchedule["FLEXIBLE"] = "FLEXIBLE";
    SleepSchedule["REGULAR"] = "REGULAR";
})(SleepSchedule || (SleepSchedule = {}));
export var SmokingHabit;
(function (SmokingHabit) {
    SmokingHabit["NEVER"] = "NEVER";
    SmokingHabit["OCCASIONALLY"] = "OCCASIONALLY";
    SmokingHabit["REGULARLY"] = "REGULARLY";
    SmokingHabit["QUITTING"] = "QUITTING";
    SmokingHabit["NO_PREFERENCE"] = "NO_PREFERENCE";
})(SmokingHabit || (SmokingHabit = {}));
export var DrinkingHabit;
(function (DrinkingHabit) {
    DrinkingHabit["NEVER"] = "NEVER";
    DrinkingHabit["SOCIALLY"] = "SOCIALLY";
    DrinkingHabit["REGULARLY"] = "REGULARLY";
    DrinkingHabit["NO_PREFERENCE"] = "NO_PREFERENCE";
})(DrinkingHabit || (DrinkingHabit = {}));
export var PetPreference;
(function (PetPreference) {
    PetPreference["DOGS"] = "DOGS";
    PetPreference["CATS"] = "CATS";
    PetPreference["OTHER"] = "OTHER";
    PetPreference["NO_PETS"] = "NO_PETS";
    PetPreference["ALLERGIC"] = "ALLERGIC";
    PetPreference["NO_PREFERENCE"] = "NO_PREFERENCE";
})(PetPreference || (PetPreference = {}));
export var ExerciseFrequency;
(function (ExerciseFrequency) {
    ExerciseFrequency["NEVER"] = "NEVER";
    ExerciseFrequency["OCCASIONALLY"] = "OCCASIONALLY";
    ExerciseFrequency["REGULARLY"] = "REGULARLY";
    ExerciseFrequency["DAILY"] = "DAILY";
    ExerciseFrequency["NO_PREFERENCE"] = "NO_PREFERENCE";
})(ExerciseFrequency || (ExerciseFrequency = {}));
export var DietPreference;
(function (DietPreference) {
    DietPreference["OMNIVORE"] = "OMNIVORE";
    DietPreference["VEGETARIAN"] = "VEGETARIAN";
    DietPreference["VEGAN"] = "VEGAN";
    DietPreference["HALAL"] = "HALAL";
    DietPreference["KOSHER"] = "KOSHER";
    DietPreference["GLUTEN_FREE"] = "GLUTEN_FREE";
    DietPreference["NO_PREFERENCE"] = "NO_PREFERENCE";
})(DietPreference || (DietPreference = {}));
export var RelationshipPace;
(function (RelationshipPace) {
    RelationshipPace["TAKE_IT_SLOW"] = "TAKE_IT_SLOW";
    RelationshipPace["MODERATE"] = "MODERATE";
    RelationshipPace["READY_TO_COMMIT"] = "READY_TO_COMMIT";
})(RelationshipPace || (RelationshipPace = {}));
export var LivingArrangement;
(function (LivingArrangement) {
    LivingArrangement["LIVE_ALONE"] = "LIVE_ALONE";
    LivingArrangement["WITH_FAMILY"] = "WITH_FAMILY";
    LivingArrangement["WITH_ROOMMATES"] = "WITH_ROOMMATES";
    LivingArrangement["OPEN_TO_MOVE"] = "OPEN_TO_MOVE";
})(LivingArrangement || (LivingArrangement = {}));
export var FamilyPlan;
(function (FamilyPlan) {
    FamilyPlan["WANT_CHILDREN"] = "WANT_CHILDREN";
    FamilyPlan["DO_NOT_WANT_CHILDREN"] = "DO_NOT_WANT_CHILDREN";
    FamilyPlan["OPEN_MINDED"] = "OPEN_MINDED";
    FamilyPlan["HAVE_CHILDREN"] = "HAVE_CHILDREN";
    FamilyPlan["NOT_SURE"] = "NOT_SURE";
})(FamilyPlan || (FamilyPlan = {}));
export const DEFAULT_SIMILARITY_WEIGHTS = {
    basicConditions: 0.2,
    personality: 0.2,
    interests: 0.15,
    lifestyle: 0.15,
    expectations: 0.15,
    complementary: 0.1,
    geoProximity: 0.05,
};
// Mock calculateDatingSimilarity
export function calculateDatingSimilarity(_profileA, _profileB, _weights) {
    return {
        totalScore: 50 + Math.floor(Math.random() * 50),
        dimensions: [
            { dimension: 'basicConditions', score: 60, weight: 0.2, weightedScore: 12, details: [] },
            { dimension: 'personality', score: 70, weight: 0.2, weightedScore: 14, details: [] },
            { dimension: 'interests', score: 55, weight: 0.15, weightedScore: 8.25, details: [] },
            { dimension: 'lifestyle', score: 65, weight: 0.15, weightedScore: 9.75, details: [] },
            { dimension: 'expectations', score: 80, weight: 0.15, weightedScore: 12, details: [] },
            { dimension: 'complementary', score: 60, weight: 0.1, weightedScore: 6, details: [] },
            { dimension: 'geoProximity', score: 70, weight: 0.05, weightedScore: 3.5, details: [] },
        ],
        highlights: ['匹配亮点'],
        warnings: [],
    };
}
// Dating labels
export const DATING_AGE_RANGE_LABELS = {};
export const HEIGHT_RANGE_LABELS = {};
export const DATING_EDUCATION_LABELS = {};
export const INCOME_LABELS = {};
export const DATING_PURPOSE_LABELS = {};
export const VISIBILITY_LABELS = {};
export var EducationPreference;
(function (EducationPreference) {
    EducationPreference["HIGH_SCHOOL"] = "HIGH_SCHOOL";
    EducationPreference["ASSOCIATE"] = "ASSOCIATE";
    EducationPreference["BACHELOR"] = "BACHELOR";
    EducationPreference["MASTER"] = "MASTER";
    EducationPreference["DOCTORATE"] = "DOCTORATE";
    EducationPreference["NO_PREFERENCE"] = "NO_PREFERENCE";
})(EducationPreference || (EducationPreference = {}));
//# sourceMappingURL=shared.js.map