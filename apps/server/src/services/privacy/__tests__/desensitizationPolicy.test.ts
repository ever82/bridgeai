/**
 * Desensitization Policy Service Tests
 */

import {
  getPredefinedTemplates,
  getTemplateById,
  getTemplateByLevel,
  createCustomTemplate,
  getRecommendedTemplateForScene,
  getSceneRecommendation,
  applyTemplateRules,
  validateRule,
  addToWhitelist,
  removeFromWhitelist,
  isWhitelisted,
  createDefaultPolicy,
  updatePolicy,
  getEffectiveRules,
  PrivacyLevel,
} from '../desensitizationPolicy';
import { SensitiveType } from '../../ai/sensitiveContentDetection';
import { DesensitizationRule } from '../desensitizationPolicy';

describe('Desensitization Policy Service', () => {
  describe('getPredefinedTemplates', () => {
    it('should return all predefined templates', () => {
      const templates = getPredefinedTemplates();
      expect(templates).toHaveLength(3);
      expect(templates.map(t => t.id)).toEqual([
        'template-strict',
        'template-standard',
        'template-relaxed',
      ]);
    });
  });

  describe('getTemplateById', () => {
    it('should return template by id', () => {
      const template = getTemplateById('template-strict');
      expect(template).toBeDefined();
      expect(template?.privacyLevel).toBe('strict');
    });

    it('should return undefined for unknown id', () => {
      const template = getTemplateById('template-nonexistent');
      expect(template).toBeUndefined();
    });
  });

  describe('getTemplateByLevel', () => {
    it('should return template by privacy level', () => {
      const strict = getTemplateByLevel('strict');
      expect(strict?.id).toBe('template-strict');

      const standard = getTemplateByLevel('standard');
      expect(standard?.id).toBe('template-standard');

      const relaxed = getTemplateByLevel('relaxed');
      expect(relaxed?.id).toBe('template-relaxed');
    });

    it('should return undefined for unknown level', () => {
      const result = getTemplateByLevel('unknown' as PrivacyLevel);
      expect(result).toBeUndefined();
    });
  });

  describe('createCustomTemplate', () => {
    it('should create a custom template', () => {
      const template = createCustomTemplate('My Template', 'Custom description', 'standard');

      expect(template.id).toMatch(/^template-custom-/);
      expect(template.name).toBe('My Template');
      expect(template.description).toBe('Custom description');
      expect(template.privacyLevel).toBe('standard');
      expect(template.createdAt).toBeInstanceOf(Date);
      expect(template.updatedAt).toBeInstanceOf(Date);
    });

    it('should copy rules from base template if provided', () => {
      const template = createCustomTemplate(
        'Based on strict',
        'description',
        'strict',
        'template-strict'
      );

      expect(template.rules.length).toBeGreaterThan(0);
      expect(template.autoDesensitize).toBe(true);
    });
  });

  describe('getRecommendedTemplateForScene', () => {
    it('should recommend strict for street', () => {
      const template = getRecommendedTemplateForScene('street');
      expect(template?.id).toBe('template-strict');
    });

    it('should recommend standard for office', () => {
      const template = getRecommendedTemplateForScene('office');
      expect(template?.id).toBe('template-standard');
    });

    it('should recommend relaxed for home', () => {
      const template = getRecommendedTemplateForScene('home');
      expect(template?.id).toBe('template-relaxed');
    });

    it('should recommend standard for unknown scenes', () => {
      const template = getRecommendedTemplateForScene('unknown-scene');
      expect(template?.id).toBe('template-standard');
    });

    it('should recommend strict for hospital', () => {
      const template = getRecommendedTemplateForScene('hospital');
      expect(template?.id).toBe('template-strict');
    });

    it('should recommend strict for school', () => {
      const template = getRecommendedTemplateForScene('school');
      expect(template?.id).toBe('template-strict');
    });
  });

  describe('getSceneRecommendation', () => {
    it('should return scene recommendation', () => {
      const rec = getSceneRecommendation('street');
      expect(rec?.scene).toBe('street');
      expect(rec?.templateId).toBe('template-strict');
    });

    it('should return undefined for unknown scene', () => {
      const rec = getSceneRecommendation('unknown');
      expect(rec).toBeUndefined();
    });
  });

  describe('applyTemplateRules', () => {
    it('should apply rules from a template to content types', () => {
      const template = getTemplateById('template-strict')!;
      const results = applyTemplateRules(template, ['face', 'license_plate']);

      expect(results.length).toBe(2);
      const faceResult = results.find(r => r.contentType === 'face');
      expect(faceResult?.method).toBe('blur');
    });

    it('should return default for content types not in template', () => {
      const template = getTemplateById('template-standard')!;
      const results = applyTemplateRules(template, ['face', 'unknown_type' as SensitiveType]);

      const unknownResult = results.find(r => r.contentType === 'unknown_type');
      expect(unknownResult?.method).toBe('blur');
      expect(unknownResult?.intensity).toBe(template.defaultIntensity);
    });

    it('should use average of min and max intensity', () => {
      const template = getTemplateById('template-strict')!;
      const results = applyTemplateRules(template, ['face']);

      // template-strict face: minIntensity=80, maxIntensity=100 => avg=90
      expect(results[0].intensity).toBe(90);
    });
  });

  describe('validateRule', () => {
    it('should validate a correct rule', () => {
      const rule: DesensitizationRule = {
        id: 'test-rule',
        name: 'Test Rule',
        enabled: true,
        contentTypes: ['face'],
        method: 'blur',
        minIntensity: 50,
        maxIntensity: 80,
        autoApply: false,
      };

      const result = validateRule(rule);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject rule with empty name', () => {
      const rule: DesensitizationRule = {
        id: 'test-rule',
        name: '',
        enabled: true,
        contentTypes: ['face'],
        method: 'blur',
        minIntensity: 50,
        maxIntensity: 80,
        autoApply: false,
      };

      const result = validateRule(rule);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Rule name is required');
    });

    it('should reject rule with empty content types', () => {
      const rule: DesensitizationRule = {
        id: 'test-rule',
        name: 'Test Rule',
        enabled: true,
        contentTypes: [],
        method: 'blur',
        minIntensity: 50,
        maxIntensity: 80,
        autoApply: false,
      };

      const result = validateRule(rule);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one content type must be selected');
    });

    it('should reject rule with invalid intensity range', () => {
      const rule: DesensitizationRule = {
        id: 'test-rule',
        name: 'Test Rule',
        enabled: true,
        contentTypes: ['face'],
        method: 'blur',
        minIntensity: 0,
        maxIntensity: 150,
        autoApply: false,
      };

      const result = validateRule(rule);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Max intensity'))).toBe(true);
    });

    it('should reject rule with min > max intensity', () => {
      const rule: DesensitizationRule = {
        id: 'test-rule',
        name: 'Test Rule',
        enabled: true,
        contentTypes: ['face'],
        method: 'blur',
        minIntensity: 80,
        maxIntensity: 50,
        autoApply: false,
      };

      const result = validateRule(rule);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Min intensity cannot be greater than max intensity');
    });
  });

  describe('Whitelist operations', () => {
    let policy: ReturnType<typeof createDefaultPolicy>;

    beforeEach(() => {
      policy = createDefaultPolicy('user-123');
    });

    describe('addToWhitelist', () => {
      it('should add entry to whitelist', () => {
        const updated = addToWhitelist(policy, {
          type: 'face',
          value: 'John Doe',
          description: 'Test person',
        });

        expect(updated.whitelist.length).toBe(1);
        expect(updated.whitelist[0].id).toMatch(/^whitelist-/);
        expect(updated.whitelist[0].type).toBe('face');
      });
    });

    describe('removeFromWhitelist', () => {
      it('should remove entry from whitelist', () => {
        const withEntry = addToWhitelist(policy, {
          type: 'face',
          value: 'John Doe',
        });

        const entryId = withEntry.whitelist[0].id;
        const updated = removeFromWhitelist(withEntry, entryId);

        expect(updated.whitelist).toHaveLength(0);
      });

      it('should not change whitelist if entry not found', () => {
        const updated = removeFromWhitelist(policy, 'nonexistent-id');
        expect(updated.whitelist).toEqual(policy.whitelist);
      });
    });

    describe('isWhitelisted', () => {
      it('should return true for whitelisted face', () => {
        const withEntry = addToWhitelist(policy, {
          type: 'face',
          value: 'John Doe',
        });

        expect(isWhitelisted(withEntry, 'face', 'John Doe')).toBe(true);
      });

      it('should return false for non-whitelisted content', () => {
        expect(isWhitelisted(policy, 'face', 'Unknown')).toBe(false);
      });

      it('should support pattern matching', () => {
        const withPattern = addToWhitelist(policy, {
          type: 'pattern',
          value: '^John.*',
        });

        expect(isWhitelisted(withPattern, 'face', 'John Doe')).toBe(true);
        expect(isWhitelisted(withPattern, 'face', 'Jane Doe')).toBe(false);
      });
    });
  });

  describe('Policy configuration', () => {
    describe('createDefaultPolicy', () => {
      it('should create a default policy for user', () => {
        const policy = createDefaultPolicy('user-456');

        expect(policy.userId).toBe('user-456');
        expect(policy.activeTemplateId).toBe('template-standard');
        expect(policy.customRules).toEqual([]);
        expect(policy.whitelist).toEqual([]);
        expect(policy.autoDesensitize).toBe(true);
        expect(policy.defaultMethod).toBe('blur');
      });
    });

    describe('updatePolicy', () => {
      it('should update policy fields', () => {
        const policy = createDefaultPolicy('user-123');
        const updated = updatePolicy(policy, {
          autoDesensitize: false,
          activeTemplateId: 'template-strict',
        });

        expect(updated.autoDesensitize).toBe(false);
        expect(updated.activeTemplateId).toBe('template-strict');
        expect(updated.userId).toBe('user-123');
      });
    });

    describe('getEffectiveRules', () => {
      it('should return template rules when no custom rules', () => {
        const policy = createDefaultPolicy('user-123');
        policy.activeTemplateId = 'template-strict';

        const rules = getEffectiveRules(policy);
        expect(rules.length).toBeGreaterThan(0);
      });

      it('should merge custom rules with template rules', () => {
        const policy = createDefaultPolicy('user-123');
        policy.activeTemplateId = 'template-standard';
        policy.customRules = [
          {
            id: 'custom-rule-1',
            name: 'Custom Rule',
            enabled: true,
            contentTypes: ['face'],
            method: 'pixelate',
            minIntensity: 60,
            maxIntensity: 90,
            autoApply: false,
          },
        ];

        const rules = getEffectiveRules(policy);
        expect(rules.length).toBeGreaterThan(policy.customRules.length);
        const customRule = rules.find(r => r.id === 'custom-rule-1');
        expect(customRule).toBeDefined();
      });
    });
  });
});
