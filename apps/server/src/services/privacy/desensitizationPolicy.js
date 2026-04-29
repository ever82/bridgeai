/**
 * Desensitization Policy Service
 * Manages privacy policies, templates, rules, and configurations
 */
// Predefined templates
export const PREDEFINED_TEMPLATES = [
    {
        id: 'template-strict',
        name: '严格模式',
        description: '最高级别的隐私保护，适用于敏感场合',
        privacyLevel: 'strict',
        autoDesensitize: true,
        defaultIntensity: 90,
        rules: [
            {
                id: 'rule-face-strict',
                name: '人脸严格脱敏',
                enabled: true,
                contentTypes: ['face'],
                method: 'blur',
                minIntensity: 80,
                maxIntensity: 100,
                autoApply: true,
            },
            {
                id: 'rule-plate-strict',
                name: '车牌严格脱敏',
                enabled: true,
                contentTypes: ['license_plate'],
                method: 'mosaic',
                minIntensity: 90,
                maxIntensity: 100,
                autoApply: true,
            },
            {
                id: 'rule-address-strict',
                name: '地址严格脱敏',
                enabled: true,
                contentTypes: ['address'],
                method: 'pixelate',
                minIntensity: 85,
                maxIntensity: 100,
                autoApply: true,
            },
            {
                id: 'rule-text-strict',
                name: '文字严格脱敏',
                enabled: true,
                contentTypes: ['text'],
                method: 'blur',
                minIntensity: 70,
                maxIntensity: 100,
                autoApply: true,
            },
            {
                id: 'rule-object-strict',
                name: '敏感物体严格脱敏',
                enabled: true,
                contentTypes: ['sensitive_object'],
                method: 'replace_background',
                minIntensity: 90,
                maxIntensity: 100,
                autoApply: true,
            },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: 'template-standard',
        name: '标准模式',
        description: '平衡的隐私保护和图像质量',
        privacyLevel: 'standard',
        autoDesensitize: true,
        defaultIntensity: 70,
        rules: [
            {
                id: 'rule-face-standard',
                name: '人脸标准脱敏',
                enabled: true,
                contentTypes: ['face'],
                method: 'blur',
                minIntensity: 60,
                maxIntensity: 80,
                autoApply: true,
            },
            {
                id: 'rule-plate-standard',
                name: '车牌标准脱敏',
                enabled: true,
                contentTypes: ['license_plate'],
                method: 'mosaic',
                minIntensity: 75,
                maxIntensity: 90,
                autoApply: true,
            },
            {
                id: 'rule-address-standard',
                name: '地址标准脱敏',
                enabled: true,
                contentTypes: ['address'],
                method: 'pixelate',
                minIntensity: 70,
                maxIntensity: 85,
                autoApply: true,
            },
            {
                id: 'rule-text-standard',
                name: '文字选择性脱敏',
                enabled: true,
                contentTypes: ['text'],
                method: 'blur',
                minIntensity: 50,
                maxIntensity: 70,
                autoApply: false,
            },
            {
                id: 'rule-code-standard',
                name: '二维码/条码脱敏',
                enabled: true,
                contentTypes: ['qr_code', 'barcode'],
                method: 'mosaic',
                minIntensity: 80,
                maxIntensity: 95,
                autoApply: true,
            },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: 'template-relaxed',
        name: '宽松模式',
        description: '最小限度的脱敏，适用于非敏感场合',
        privacyLevel: 'relaxed',
        autoDesensitize: false,
        defaultIntensity: 50,
        rules: [
            {
                id: 'rule-face-relaxed',
                name: '人脸轻度脱敏',
                enabled: true,
                contentTypes: ['face'],
                method: 'blur',
                minIntensity: 40,
                maxIntensity: 60,
                autoApply: false,
            },
            {
                id: 'rule-plate-relaxed',
                name: '车牌轻度脱敏',
                enabled: true,
                contentTypes: ['license_plate'],
                method: 'blur',
                minIntensity: 50,
                maxIntensity: 70,
                autoApply: false,
            },
            {
                id: 'rule-address-relaxed',
                name: '地址轻度脱敏',
                enabled: false,
                contentTypes: ['address'],
                method: 'pixelate',
                minIntensity: 50,
                maxIntensity: 70,
                autoApply: false,
            },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];
// Scene-based recommendations
export const SCENE_RECOMMENDATIONS = [
    { scene: 'street', templateId: 'template-strict', reason: '公共场所需要严格保护' },
    { scene: 'office', templateId: 'template-standard', reason: '办公环境建议标准保护' },
    { scene: 'home', templateId: 'template-relaxed', reason: '私人空间可适当放宽' },
    { scene: 'restaurant', templateId: 'template-standard', reason: '社交场合建议标准保护' },
    { scene: 'school', templateId: 'template-strict', reason: '教育场所需要严格保护' },
    { scene: 'hospital', templateId: 'template-strict', reason: '医疗场所需要严格保护' },
];
/**
 * Get all predefined templates
 */
export function getPredefinedTemplates() {
    return PREDEFINED_TEMPLATES;
}
/**
 * Get a template by ID
 */
export function getTemplateById(templateId) {
    return PREDEFINED_TEMPLATES.find((t) => t.id === templateId);
}
/**
 * Get template by privacy level
 */
export function getTemplateByLevel(level) {
    return PREDEFINED_TEMPLATES.find((t) => t.privacyLevel === level);
}
/**
 * Create a custom template
 */
export function createCustomTemplate(name, description, privacyLevel, baseTemplateId) {
    const baseTemplate = baseTemplateId ? getTemplateById(baseTemplateId) : undefined;
    return {
        id: `template-custom-${Date.now()}`,
        name,
        description,
        privacyLevel,
        rules: baseTemplate ? [...baseTemplate.rules] : [],
        autoDesensitize: baseTemplate?.autoDesensitize ?? false,
        defaultIntensity: baseTemplate?.defaultIntensity ?? 70,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
/**
 * Get recommended template for a scene
 */
export function getRecommendedTemplateForScene(scene) {
    const recommendation = SCENE_RECOMMENDATIONS.find((r) => r.scene === scene);
    if (recommendation) {
        return getTemplateById(recommendation.templateId);
    }
    return getTemplateByLevel('standard');
}
/**
 * Get scene recommendation details
 */
export function getSceneRecommendation(scene) {
    return SCENE_RECOMMENDATIONS.find((r) => r.scene === scene);
}
/**
 * Apply rules from a template to detections
 */
export function applyTemplateRules(template, contentTypes) {
    const results = [];
    for (const contentType of contentTypes) {
        // Find matching rule
        const rule = template.rules.find((r) => r.enabled && r.contentTypes.includes(contentType));
        if (rule) {
            results.push({
                contentType,
                method: rule.method,
                intensity: (rule.minIntensity + rule.maxIntensity) / 2,
            });
        }
        else {
            // Use default
            results.push({
                contentType,
                method: 'blur',
                intensity: template.defaultIntensity,
            });
        }
    }
    return results;
}
/**
 * Validate a custom rule
 */
export function validateRule(rule) {
    const errors = [];
    if (!rule.name || rule.name.trim().length === 0) {
        errors.push('Rule name is required');
    }
    if (rule.contentTypes.length === 0) {
        errors.push('At least one content type must be selected');
    }
    if (rule.minIntensity < 0 || rule.minIntensity > 100) {
        errors.push('Min intensity must be between 0 and 100');
    }
    if (rule.maxIntensity < 0 || rule.maxIntensity > 100) {
        errors.push('Max intensity must be between 0 and 100');
    }
    if (rule.minIntensity > rule.maxIntensity) {
        errors.push('Min intensity cannot be greater than max intensity');
    }
    return { valid: errors.length === 0, errors };
}
/**
 * Add entry to whitelist
 */
export function addToWhitelist(policy, entry) {
    const newEntry = {
        ...entry,
        id: `whitelist-${Date.now()}`,
    };
    return {
        ...policy,
        whitelist: [...policy.whitelist, newEntry],
    };
}
/**
 * Remove entry from whitelist
 */
export function removeFromWhitelist(policy, entryId) {
    return {
        ...policy,
        whitelist: policy.whitelist.filter((e) => e.id !== entryId),
    };
}
/**
 * Check if content is whitelisted
 */
export function isWhitelisted(policy, contentType, contentValue) {
    return policy.whitelist.some((entry) => {
        if (entry.type === 'pattern') {
            const regex = new RegExp(entry.value);
            return regex.test(contentValue);
        }
        return entry.type === contentType && entry.value === contentValue;
    });
}
/**
 * Create default policy configuration
 */
export function createDefaultPolicy(userId) {
    return {
        userId,
        activeTemplateId: 'template-standard',
        customRules: [],
        whitelist: [],
        autoDesensitize: true,
        defaultMethod: 'blur',
    };
}
/**
 * Update policy configuration
 */
export function updatePolicy(policy, updates) {
    return {
        ...policy,
        ...updates,
    };
}
/**
 * Get effective rules for a policy (template rules + custom rules)
 */
export function getEffectiveRules(policy) {
    const template = policy.activeTemplateId
        ? getTemplateById(policy.activeTemplateId)
        : undefined;
    const templateRules = template?.rules || [];
    // Merge template rules with custom rules (custom rules take precedence)
    const ruleMap = new Map();
    for (const rule of templateRules) {
        ruleMap.set(rule.id, rule);
    }
    for (const rule of policy.customRules) {
        ruleMap.set(rule.id, rule);
    }
    return Array.from(ruleMap.values());
}
//# sourceMappingURL=desensitizationPolicy.js.map