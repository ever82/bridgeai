"use strict";
/**
 * Disclosure Level Types
 *
 * Defines disclosure levels and field-level disclosure control
 * for protecting user privacy in the matching process.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DISCLOSABLE_FIELDS = exports.DEFAULT_FIELD_DISCLOSURES = exports.DISCLOSURE_LEVEL_INFO = exports.RelationshipStage = exports.DisclosureLevel = void 0;
exports.getRequiredStage = getRequiredStage;
exports.canDiscloseAtStage = canDiscloseAtStage;
exports.createDefaultDisclosureSettings = createDefaultDisclosureSettings;
/**
 * Disclosure levels for agent information
 * Controls visibility based on relationship stage
 */
var DisclosureLevel;
(function (DisclosureLevel) {
    /** Information visible to anyone */
    DisclosureLevel["PUBLIC"] = "PUBLIC";
    /** Information visible after matching */
    DisclosureLevel["AFTER_MATCH"] = "AFTER_MATCH";
    /** Information visible after private chat */
    DisclosureLevel["AFTER_CHAT"] = "AFTER_CHAT";
    /** Information visible after referral */
    DisclosureLevel["AFTER_REFERRAL"] = "AFTER_REFERRAL";
})(DisclosureLevel || (exports.DisclosureLevel = DisclosureLevel = {}));
/**
 * User relationship stage with another user
 * Determines what information can be disclosed
 */
var RelationshipStage;
(function (RelationshipStage) {
    /** No relationship - public visibility only */
    RelationshipStage["NONE"] = "NONE";
    /** Users have matched */
    RelationshipStage["MATCHED"] = "MATCHED";
    /** Users have engaged in private chat */
    RelationshipStage["CHATTED"] = "CHATTED";
    /** One user has referred the other */
    RelationshipStage["REFERRED"] = "REFERRED";
})(RelationshipStage || (exports.RelationshipStage = RelationshipStage = {}));
/**
 * Disclosure level metadata for UI display
 */
exports.DISCLOSURE_LEVEL_INFO = {
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
        name: '引荐后可见',
        description: '经人引荐后可见',
        icon: 'user-plus',
        color: '#9C27B0',
        order: 3,
    },
};
/**
 * Default field disclosure configurations
 * Sensible defaults for common agent fields
 */
exports.DEFAULT_FIELD_DISCLOSURES = [
    { fieldName: 'name', level: DisclosureLevel.PUBLIC, isDisclosable: true, defaultLevel: DisclosureLevel.PUBLIC },
    { fieldName: 'avatar', level: DisclosureLevel.PUBLIC, isDisclosable: true, defaultLevel: DisclosureLevel.PUBLIC },
    { fieldName: 'bio', level: DisclosureLevel.PUBLIC, isDisclosable: true, defaultLevel: DisclosureLevel.PUBLIC },
    { fieldName: 'industry', level: DisclosureLevel.PUBLIC, isDisclosable: true, defaultLevel: DisclosureLevel.PUBLIC },
    { fieldName: 'location', level: DisclosureLevel.AFTER_MATCH, isDisclosable: true, defaultLevel: DisclosureLevel.AFTER_MATCH },
    { fieldName: 'contact', level: DisclosureLevel.AFTER_CHAT, isDisclosable: true, defaultLevel: DisclosureLevel.AFTER_CHAT },
    { fieldName: 'email', level: DisclosureLevel.AFTER_CHAT, isDisclosable: true, defaultLevel: DisclosureLevel.AFTER_CHAT },
    { fieldName: 'phone', level: DisclosureLevel.AFTER_REFERRAL, isDisclosable: true, defaultLevel: DisclosureLevel.AFTER_REFERRAL },
    { fieldName: 'company', level: DisclosureLevel.AFTER_MATCH, isDisclosable: true, defaultLevel: DisclosureLevel.AFTER_MATCH },
    { fieldName: 'socialLinks', level: DisclosureLevel.AFTER_CHAT, isDisclosable: true, defaultLevel: DisclosureLevel.AFTER_CHAT },
];
/**
 * Get the minimum relationship stage required to view a disclosure level
 */
function getRequiredStage(level) {
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
/**
 * Check if a relationship stage satisfies a disclosure level requirement
 */
function canDiscloseAtStage(requiredLevel, currentStage) {
    const requiredStage = getRequiredStage(requiredLevel);
    const stageOrder = {
        [RelationshipStage.NONE]: 0,
        [RelationshipStage.MATCHED]: 1,
        [RelationshipStage.CHATTED]: 2,
        [RelationshipStage.REFERRED]: 3,
    };
    return stageOrder[currentStage] >= stageOrder[requiredStage];
}
/**
 * Create default disclosure settings for an agent
 */
function createDefaultDisclosureSettings(agentId, userId) {
    return {
        agentId,
        userId,
        fieldDisclosures: [...exports.DEFAULT_FIELD_DISCLOSURES],
        defaultLevel: DisclosureLevel.AFTER_MATCH,
        strictMode: false,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
    };
}
/**
 * Common agent fields that can have disclosure settings
 */
exports.DISCLOSABLE_FIELDS = [
    'name',
    'avatar',
    'bio',
    'industry',
    'location',
    'contact',
    'email',
    'phone',
    'company',
    'socialLinks',
    'skills',
    'interests',
    'experience',
    'education',
];
//# sourceMappingURL=disclosure.js.map