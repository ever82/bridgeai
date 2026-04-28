"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Disclosure Types Tests
 */
const disclosure_1 = require("../disclosure");
describe('Disclosure Types', () => {
    describe('DisclosureLevel enum', () => {
        it('should have correct values', () => {
            expect(disclosure_1.DisclosureLevel.PUBLIC).toBe('PUBLIC');
            expect(disclosure_1.DisclosureLevel.AFTER_MATCH).toBe('AFTER_MATCH');
            expect(disclosure_1.DisclosureLevel.AFTER_CHAT).toBe('AFTER_CHAT');
            expect(disclosure_1.DisclosureLevel.AFTER_REFERRAL).toBe('AFTER_REFERRAL');
        });
    });
    describe('RelationshipStage enum', () => {
        it('should have correct values', () => {
            expect(disclosure_1.RelationshipStage.NONE).toBe('NONE');
            expect(disclosure_1.RelationshipStage.MATCHED).toBe('MATCHED');
            expect(disclosure_1.RelationshipStage.CHATTED).toBe('CHATTED');
            expect(disclosure_1.RelationshipStage.REFERRED).toBe('REFERRED');
        });
    });
    describe('getRequiredStage', () => {
        it('should return NONE for PUBLIC level', () => {
            expect((0, disclosure_1.getRequiredStage)(disclosure_1.DisclosureLevel.PUBLIC)).toBe(disclosure_1.RelationshipStage.NONE);
        });
        it('should return MATCHED for AFTER_MATCH level', () => {
            expect((0, disclosure_1.getRequiredStage)(disclosure_1.DisclosureLevel.AFTER_MATCH)).toBe(disclosure_1.RelationshipStage.MATCHED);
        });
        it('should return CHATTED for AFTER_CHAT level', () => {
            expect((0, disclosure_1.getRequiredStage)(disclosure_1.DisclosureLevel.AFTER_CHAT)).toBe(disclosure_1.RelationshipStage.CHATTED);
        });
        it('should return REFERRED for AFTER_REFERRAL level', () => {
            expect((0, disclosure_1.getRequiredStage)(disclosure_1.DisclosureLevel.AFTER_REFERRAL)).toBe(disclosure_1.RelationshipStage.REFERRED);
        });
    });
    describe('canDiscloseAtStage', () => {
        it('should allow PUBLIC at any stage', () => {
            expect((0, disclosure_1.canDiscloseAtStage)(disclosure_1.DisclosureLevel.PUBLIC, disclosure_1.RelationshipStage.NONE)).toBe(true);
            expect((0, disclosure_1.canDiscloseAtStage)(disclosure_1.DisclosureLevel.PUBLIC, disclosure_1.RelationshipStage.MATCHED)).toBe(true);
            expect((0, disclosure_1.canDiscloseAtStage)(disclosure_1.DisclosureLevel.PUBLIC, disclosure_1.RelationshipStage.CHATTED)).toBe(true);
            expect((0, disclosure_1.canDiscloseAtStage)(disclosure_1.DisclosureLevel.PUBLIC, disclosure_1.RelationshipStage.REFERRED)).toBe(true);
        });
        it('should allow AFTER_MATCH only at MATCHED or higher', () => {
            expect((0, disclosure_1.canDiscloseAtStage)(disclosure_1.DisclosureLevel.AFTER_MATCH, disclosure_1.RelationshipStage.NONE)).toBe(false);
            expect((0, disclosure_1.canDiscloseAtStage)(disclosure_1.DisclosureLevel.AFTER_MATCH, disclosure_1.RelationshipStage.MATCHED)).toBe(true);
            expect((0, disclosure_1.canDiscloseAtStage)(disclosure_1.DisclosureLevel.AFTER_MATCH, disclosure_1.RelationshipStage.CHATTED)).toBe(true);
            expect((0, disclosure_1.canDiscloseAtStage)(disclosure_1.DisclosureLevel.AFTER_MATCH, disclosure_1.RelationshipStage.REFERRED)).toBe(true);
        });
        it('should allow AFTER_CHAT only at CHATTED or higher', () => {
            expect((0, disclosure_1.canDiscloseAtStage)(disclosure_1.DisclosureLevel.AFTER_CHAT, disclosure_1.RelationshipStage.NONE)).toBe(false);
            expect((0, disclosure_1.canDiscloseAtStage)(disclosure_1.DisclosureLevel.AFTER_CHAT, disclosure_1.RelationshipStage.MATCHED)).toBe(false);
            expect((0, disclosure_1.canDiscloseAtStage)(disclosure_1.DisclosureLevel.AFTER_CHAT, disclosure_1.RelationshipStage.CHATTED)).toBe(true);
            expect((0, disclosure_1.canDiscloseAtStage)(disclosure_1.DisclosureLevel.AFTER_CHAT, disclosure_1.RelationshipStage.REFERRED)).toBe(true);
        });
        it('should allow AFTER_REFERRAL only at REFERRED', () => {
            expect((0, disclosure_1.canDiscloseAtStage)(disclosure_1.DisclosureLevel.AFTER_REFERRAL, disclosure_1.RelationshipStage.NONE)).toBe(false);
            expect((0, disclosure_1.canDiscloseAtStage)(disclosure_1.DisclosureLevel.AFTER_REFERRAL, disclosure_1.RelationshipStage.MATCHED)).toBe(false);
            expect((0, disclosure_1.canDiscloseAtStage)(disclosure_1.DisclosureLevel.AFTER_REFERRAL, disclosure_1.RelationshipStage.CHATTED)).toBe(false);
            expect((0, disclosure_1.canDiscloseAtStage)(disclosure_1.DisclosureLevel.AFTER_REFERRAL, disclosure_1.RelationshipStage.REFERRED)).toBe(true);
        });
    });
    describe('createDefaultDisclosureSettings', () => {
        it('should create settings with correct agentId and userId', () => {
            const settings = (0, disclosure_1.createDefaultDisclosureSettings)('agent-1', 'user-1');
            expect(settings.agentId).toBe('agent-1');
            expect(settings.userId).toBe('user-1');
        });
        it('should include default field disclosures', () => {
            const settings = (0, disclosure_1.createDefaultDisclosureSettings)('agent-1', 'user-1');
            expect(settings.fieldDisclosures).toBeDefined();
            expect(settings.fieldDisclosures.length).toBe(disclosure_1.DEFAULT_FIELD_DISCLOSURES.length);
        });
        it('should have default AFTER_MATCH as default level', () => {
            const settings = (0, disclosure_1.createDefaultDisclosureSettings)('agent-1', 'user-1');
            expect(settings.defaultLevel).toBe(disclosure_1.DisclosureLevel.AFTER_MATCH);
        });
        it('should have strictMode set to false', () => {
            const settings = (0, disclosure_1.createDefaultDisclosureSettings)('agent-1', 'user-1');
            expect(settings.strictMode).toBe(false);
        });
        it('should have valid timestamps', () => {
            const settings = (0, disclosure_1.createDefaultDisclosureSettings)('agent-1', 'user-1');
            expect(settings.createdAt).toBeDefined();
            expect(settings.updatedAt).toBeDefined();
            // Check timestamps are valid ISO strings
            expect(new Date(settings.createdAt).toISOString()).toBe(settings.createdAt);
            expect(new Date(settings.updatedAt).toISOString()).toBe(settings.updatedAt);
        });
    });
    describe('DEFAULT_FIELD_DISCLOSURES', () => {
        it('should include common fields', () => {
            const fieldNames = disclosure_1.DEFAULT_FIELD_DISCLOSURES.map(f => f.fieldName);
            expect(fieldNames).toContain('name');
            expect(fieldNames).toContain('avatar');
            expect(fieldNames).toContain('email');
            expect(fieldNames).toContain('phone');
            expect(fieldNames).toContain('location');
        });
        it('should have sensible defaults for sensitive fields', () => {
            const phoneField = disclosure_1.DEFAULT_FIELD_DISCLOSURES.find(f => f.fieldName === 'phone');
            const emailField = disclosure_1.DEFAULT_FIELD_DISCLOSURES.find(f => f.fieldName === 'email');
            const nameField = disclosure_1.DEFAULT_FIELD_DISCLOSURES.find(f => f.fieldName === 'name');
            expect(phoneField?.level).toBe(disclosure_1.DisclosureLevel.AFTER_REFERRAL);
            expect(emailField?.level).toBe(disclosure_1.DisclosureLevel.AFTER_CHAT);
            expect(nameField?.level).toBe(disclosure_1.DisclosureLevel.PUBLIC);
        });
        it('should have all fields as disclosable', () => {
            disclosure_1.DEFAULT_FIELD_DISCLOSURES.forEach(field => {
                expect(field.isDisclosable).toBe(true);
            });
        });
    });
    describe('DISCLOSABLE_FIELDS', () => {
        it('should be an array of strings', () => {
            expect(Array.isArray(disclosure_1.DISCLOSABLE_FIELDS)).toBe(true);
            disclosure_1.DISCLOSABLE_FIELDS.forEach(field => {
                expect(typeof field).toBe('string');
            });
        });
    });
    describe('DISCLOSURE_LEVEL_INFO', () => {
        it('should have info for all disclosure levels', () => {
            Object.values(disclosure_1.DisclosureLevel).forEach(level => {
                expect(disclosure_1.DISCLOSURE_LEVEL_INFO[level]).toBeDefined();
            });
        });
        it('should have correct order for levels', () => {
            expect(disclosure_1.DISCLOSURE_LEVEL_INFO[disclosure_1.DisclosureLevel.PUBLIC].order).toBe(0);
            expect(disclosure_1.DISCLOSURE_LEVEL_INFO[disclosure_1.DisclosureLevel.AFTER_MATCH].order).toBe(1);
            expect(disclosure_1.DISCLOSURE_LEVEL_INFO[disclosure_1.DisclosureLevel.AFTER_CHAT].order).toBe(2);
            expect(disclosure_1.DISCLOSURE_LEVEL_INFO[disclosure_1.DisclosureLevel.AFTER_REFERRAL].order).toBe(3);
        });
        it('should have display names in Chinese', () => {
            expect(disclosure_1.DISCLOSURE_LEVEL_INFO[disclosure_1.DisclosureLevel.PUBLIC].name).toBe('公开');
            expect(disclosure_1.DISCLOSURE_LEVEL_INFO[disclosure_1.DisclosureLevel.AFTER_MATCH].name).toBe('匹配后可见');
            expect(disclosure_1.DISCLOSURE_LEVEL_INFO[disclosure_1.DisclosureLevel.AFTER_CHAT].name).toBe('私聊后可见');
            expect(disclosure_1.DISCLOSURE_LEVEL_INFO[disclosure_1.DisclosureLevel.AFTER_REFERRAL].name).toBe('引荐后可见');
        });
        it('should have colors defined', () => {
            Object.values(disclosure_1.DISCLOSURE_LEVEL_INFO).forEach(info => {
                expect(info.color).toBeDefined();
                expect(info.color.startsWith('#')).toBe(true);
            });
        });
    });
});
//# sourceMappingURL=disclosure.test.js.map