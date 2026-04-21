/**
 * Disclosure Types Tests
 */
import {
  DisclosureLevel,
  RelationshipStage,
  getRequiredStage,
  canDiscloseAtStage,
  createDefaultDisclosureSettings,
  DEFAULT_FIELD_DISCLOSURES,
  DISCLOSABLE_FIELDS,
  DISCLOSURE_LEVEL_INFO,
} from '../disclosure';

describe('Disclosure Types', () => {
  describe('DisclosureLevel enum', () => {
    it('should have correct values', () => {
      expect(DisclosureLevel.PUBLIC).toBe('PUBLIC');
      expect(DisclosureLevel.AFTER_MATCH).toBe('AFTER_MATCH');
      expect(DisclosureLevel.AFTER_CHAT).toBe('AFTER_CHAT');
      expect(DisclosureLevel.AFTER_REFERRAL).toBe('AFTER_REFERRAL');
    });
  });

  describe('RelationshipStage enum', () => {
    it('should have correct values', () => {
      expect(RelationshipStage.NONE).toBe('NONE');
      expect(RelationshipStage.MATCHED).toBe('MATCHED');
      expect(RelationshipStage.CHATTED).toBe('CHATTED');
      expect(RelationshipStage.REFERRED).toBe('REFERRED');
    });
  });

  describe('getRequiredStage', () => {
    it('should return NONE for PUBLIC level', () => {
      expect(getRequiredStage(DisclosureLevel.PUBLIC)).toBe(RelationshipStage.NONE);
    });

    it('should return MATCHED for AFTER_MATCH level', () => {
      expect(getRequiredStage(DisclosureLevel.AFTER_MATCH)).toBe(RelationshipStage.MATCHED);
    });

    it('should return CHATTED for AFTER_CHAT level', () => {
      expect(getRequiredStage(DisclosureLevel.AFTER_CHAT)).toBe(RelationshipStage.CHATTED);
    });

    it('should return REFERRED for AFTER_REFERRAL level', () => {
      expect(getRequiredStage(DisclosureLevel.AFTER_REFERRAL)).toBe(RelationshipStage.REFERRED);
    });
  });

  describe('canDiscloseAtStage', () => {
    it('should allow PUBLIC at any stage', () => {
      expect(canDiscloseAtStage(DisclosureLevel.PUBLIC, RelationshipStage.NONE)).toBe(true);
      expect(canDiscloseAtStage(DisclosureLevel.PUBLIC, RelationshipStage.MATCHED)).toBe(true);
      expect(canDiscloseAtStage(DisclosureLevel.PUBLIC, RelationshipStage.CHATTED)).toBe(true);
      expect(canDiscloseAtStage(DisclosureLevel.PUBLIC, RelationshipStage.REFERRED)).toBe(true);
    });

    it('should allow AFTER_MATCH only at MATCHED or higher', () => {
      expect(canDiscloseAtStage(DisclosureLevel.AFTER_MATCH, RelationshipStage.NONE)).toBe(false);
      expect(canDiscloseAtStage(DisclosureLevel.AFTER_MATCH, RelationshipStage.MATCHED)).toBe(true);
      expect(canDiscloseAtStage(DisclosureLevel.AFTER_MATCH, RelationshipStage.CHATTED)).toBe(true);
      expect(canDiscloseAtStage(DisclosureLevel.AFTER_MATCH, RelationshipStage.REFERRED)).toBe(true);
    });

    it('should allow AFTER_CHAT only at CHATTED or higher', () => {
      expect(canDiscloseAtStage(DisclosureLevel.AFTER_CHAT, RelationshipStage.NONE)).toBe(false);
      expect(canDiscloseAtStage(DisclosureLevel.AFTER_CHAT, RelationshipStage.MATCHED)).toBe(false);
      expect(canDiscloseAtStage(DisclosureLevel.AFTER_CHAT, RelationshipStage.CHATTED)).toBe(true);
      expect(canDiscloseAtStage(DisclosureLevel.AFTER_CHAT, RelationshipStage.REFERRED)).toBe(true);
    });

    it('should allow AFTER_REFERRAL only at REFERRED', () => {
      expect(canDiscloseAtStage(DisclosureLevel.AFTER_REFERRAL, RelationshipStage.NONE)).toBe(false);
      expect(canDiscloseAtStage(DisclosureLevel.AFTER_REFERRAL, RelationshipStage.MATCHED)).toBe(false);
      expect(canDiscloseAtStage(DisclosureLevel.AFTER_REFERRAL, RelationshipStage.CHATTED)).toBe(false);
      expect(canDiscloseAtStage(DisclosureLevel.AFTER_REFERRAL, RelationshipStage.REFERRED)).toBe(true);
    });
  });

  describe('createDefaultDisclosureSettings', () => {
    it('should create settings with correct agentId and userId', () => {
      const settings = createDefaultDisclosureSettings('agent-1', 'user-1');

      expect(settings.agentId).toBe('agent-1');
      expect(settings.userId).toBe('user-1');
    });

    it('should include default field disclosures', () => {
      const settings = createDefaultDisclosureSettings('agent-1', 'user-1');

      expect(settings.fieldDisclosures).toBeDefined();
      expect(settings.fieldDisclosures.length).toBe(DEFAULT_FIELD_DISCLOSURES.length);
    });

    it('should have default AFTER_MATCH as default level', () => {
      const settings = createDefaultDisclosureSettings('agent-1', 'user-1');

      expect(settings.defaultLevel).toBe(DisclosureLevel.AFTER_MATCH);
    });

    it('should have strictMode set to false', () => {
      const settings = createDefaultDisclosureSettings('agent-1', 'user-1');

      expect(settings.strictMode).toBe(false);
    });

    it('should have valid timestamps', () => {
      const settings = createDefaultDisclosureSettings('agent-1', 'user-1');

      expect(settings.createdAt).toBeDefined();
      expect(settings.updatedAt).toBeDefined();
      // Check timestamps are valid ISO strings
      expect(new Date(settings.createdAt).toISOString()).toBe(settings.createdAt);
      expect(new Date(settings.updatedAt).toISOString()).toBe(settings.updatedAt);
    });
  });

  describe('DEFAULT_FIELD_DISCLOSURES', () => {
    it('should include common fields', () => {
      const fieldNames = DEFAULT_FIELD_DISCLOSURES.map(f => f.fieldName);

      expect(fieldNames).toContain('name');
      expect(fieldNames).toContain('avatar');
      expect(fieldNames).toContain('email');
      expect(fieldNames).toContain('phone');
      expect(fieldNames).toContain('location');
    });

    it('should have sensible defaults for sensitive fields', () => {
      const phoneField = DEFAULT_FIELD_DISCLOSURES.find(f => f.fieldName === 'phone');
      const emailField = DEFAULT_FIELD_DISCLOSURES.find(f => f.fieldName === 'email');
      const nameField = DEFAULT_FIELD_DISCLOSURES.find(f => f.fieldName === 'name');

      expect(phoneField?.level).toBe(DisclosureLevel.AFTER_REFERRAL);
      expect(emailField?.level).toBe(DisclosureLevel.AFTER_CHAT);
      expect(nameField?.level).toBe(DisclosureLevel.PUBLIC);
    });

    it('should have all fields as disclosable', () => {
      DEFAULT_FIELD_DISCLOSURES.forEach(field => {
        expect(field.isDisclosable).toBe(true);
      });
    });
  });

  describe('DISCLOSABLE_FIELDS', () => {
    it('should be an array of strings', () => {
      expect(Array.isArray(DISCLOSABLE_FIELDS)).toBe(true);
      DISCLOSABLE_FIELDS.forEach(field => {
        expect(typeof field).toBe('string');
      });
    });
  });

  describe('DISCLOSURE_LEVEL_INFO', () => {
    it('should have info for all disclosure levels', () => {
      Object.values(DisclosureLevel).forEach(level => {
        expect(DISCLOSURE_LEVEL_INFO[level]).toBeDefined();
      });
    });

    it('should have correct order for levels', () => {
      expect(DISCLOSURE_LEVEL_INFO[DisclosureLevel.PUBLIC].order).toBe(0);
      expect(DISCLOSURE_LEVEL_INFO[DisclosureLevel.AFTER_MATCH].order).toBe(1);
      expect(DISCLOSURE_LEVEL_INFO[DisclosureLevel.AFTER_CHAT].order).toBe(2);
      expect(DISCLOSURE_LEVEL_INFO[DisclosureLevel.AFTER_REFERRAL].order).toBe(3);
    });

    it('should have display names in Chinese', () => {
      expect(DISCLOSURE_LEVEL_INFO[DisclosureLevel.PUBLIC].name).toBe('公开');
      expect(DISCLOSURE_LEVEL_INFO[DisclosureLevel.AFTER_MATCH].name).toBe('匹配后可见');
      expect(DISCLOSURE_LEVEL_INFO[DisclosureLevel.AFTER_CHAT].name).toBe('私聊后可见');
      expect(DISCLOSURE_LEVEL_INFO[DisclosureLevel.AFTER_REFERRAL].name).toBe('引荐后可见');
    });

    it('should have colors defined', () => {
      Object.values(DISCLOSURE_LEVEL_INFO).forEach(info => {
        expect(info.color).toBeDefined();
        expect(info.color.startsWith('#')).toBe(true);
      });
    });
  });
});
