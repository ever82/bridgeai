"use strict";
/**
 * Probe Tests for ISSUE-C006 — Scene Configuration Management
 *
 * 从最刁钻的角度测试场景配置管理系统的边界、安全、异常路径。
 * 只做只读验证，不修改源代码。
 */
Object.defineProperty(exports, "__esModule", { value: true });
const shared_1 = require("@bridgeai/shared");
const sceneMigrationService_1 = require("../sceneMigrationService");
const sceneCapabilityService_1 = require("../sceneCapabilityService");
const templateService_1 = require("../templateService");
const client_1 = require("../../db/client");
// ========================================================================
// MOCKS
// ========================================================================
jest.mock('../../db/client', () => ({
    prisma: {
        sceneTemplate: {
            create: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
            delete: jest.fn(),
        },
        agentProfile: {
            findFirst: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
        },
        agent: {
            findUnique: jest.fn(),
        },
    },
}));
jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));
const mockPrisma = client_1.prisma;
describe('PROBE: ISSUE-C006 — Scene Configuration Management', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    // ========================================================================
    // PROBE 1: transformField — merge bug (ignores config.fields, repeats value)
    // BUG: merge case returns `fields.map(() => value).join(' ')` instead of
    //      `fields.map(f => data[f]).join(' ')`. Config.fields are completely
    //      ignored; the single `value` is repeated len(fields) times.
    // ========================================================================
    describe('P1: Migration transformField — merge bug', () => {
        it('generateMigrationPlan for agentdate→agentjob produces a valid plan', () => {
            const plan = (0, sceneMigrationService_1.generateMigrationPlan)('agentdate', 'agentjob');
            expect(plan).toBeDefined();
            expect(plan.fromScene).toBe('agentdate');
            expect(plan.toScene).toBe('agentjob');
        });
        it('same-scene migration is rejected by validateMigration', () => {
            const result = (0, sceneMigrationService_1.validateMigration)('visionshare', 'visionshare');
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('same');
        });
        it('generateMigrationPlan produces warnings for field loss', () => {
            const plan = (0, sceneMigrationService_1.generateMigrationPlan)('visionshare', 'agentdate');
            // Visionshare has fields that agentdate doesn't have (and vice versa)
            expect(plan.warnings.length).toBeGreaterThan(0);
        });
    });
    // ========================================================================
    // PROBE 2: Capability dependency — circular dep detection
    // ========================================================================
    describe('P2: Capability circular dependency detection', () => {
        it('hasCircularDependencies returns false for A→B chain (no cycle)', () => {
            const result = (0, sceneCapabilityService_1.hasCircularDependencies)('visionshare', 'collaboration');
            expect(result).toBe(false);
        });
        it('hasCircularDependencies with no deps returns false', () => {
            const result = (0, sceneCapabilityService_1.hasCircularDependencies)('visionshare', 'image_upload');
            expect(result).toBe(false);
        });
        it('isCapabilityEnabled returns false for disabled capability', () => {
            const enabled = (0, sceneCapabilityService_1.isCapabilityEnabled)('visionshare', 'marketplace');
            expect(enabled).toBe(false);
        });
        it('getMissingDependencies for capability with no deps returns empty', () => {
            const missing = (0, sceneCapabilityService_1.getMissingDependencies)('visionshare', 'image_upload');
            expect(missing).toEqual([]);
        });
        it('getMissingDependencies for non-existent capability returns empty', () => {
            const missing = (0, sceneCapabilityService_1.getMissingDependencies)('visionshare', 'nonexistent_cap');
            expect(missing).toEqual([]);
        });
    });
    // ========================================================================
    // PROBE 3: Template service — applyTemplate authorization bypass
    // BUG: applyTemplate does NOT verify that the agent belongs to the requesting user.
    // An attacker can apply any template to any agent by knowing the agentId.
    // ========================================================================
    describe('P3: applyTemplate — missing agent ownership check (authorization bug)', () => {
        it('applyTemplate does NOT check agent belongs to user (authorization bypass)', async () => {
            const attackerUserId = 'attacker-user';
            const victimAgentId = 'victim-agent-123';
            const mockTemplate = {
                id: 'template-1',
                sceneId: 'visionshare',
                fieldValues: { contentType: ['photography'], purpose: 'sell' },
                isPreset: false,
            };
            const mockProfile = {
                id: 'victim-profile',
                agentId: victimAgentId,
                sceneId: 'visionshare',
                l2Data: {},
            };
            mockPrisma.sceneTemplate.findFirst.mockResolvedValue(mockTemplate);
            mockPrisma.agentProfile.findFirst.mockResolvedValue(mockProfile);
            mockPrisma.agentProfile.update.mockResolvedValue(mockProfile);
            const result = await (0, templateService_1.applyTemplate)('template-1', victimAgentId, attackerUserId);
            expect(result.success).toBe(true);
            expect(mockPrisma.agentProfile.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'victim-profile' },
                data: expect.objectContaining({
                    l2Data: expect.objectContaining({ contentType: ['photography'] }),
                }),
            }));
        });
        it('applyTemplate — non-existent template throws', async () => {
            mockPrisma.sceneTemplate.findFirst.mockResolvedValue(null);
            await expect((0, templateService_1.applyTemplate)('nonexistent', 'agent-1', 'user-1')).rejects.toThrow('Template not found');
        });
        it('applyTemplate — non-existent profile throws', async () => {
            mockPrisma.sceneTemplate.findFirst.mockResolvedValue({
                id: 'template-1',
                sceneId: 'visionshare',
                fieldValues: {},
            });
            mockPrisma.agentProfile.findFirst.mockResolvedValue(null);
            await expect((0, templateService_1.applyTemplate)('template-1', 'agent-1', 'user-1')).rejects.toThrow('Agent profile not found');
        });
        it('applyTemplate with empty fieldValues applies nothing (no crash)', async () => {
            mockPrisma.sceneTemplate.findFirst.mockResolvedValue({
                id: 'empty-template',
                sceneId: 'visionshare',
                fieldValues: {},
            });
            mockPrisma.agentProfile.findFirst.mockResolvedValue({
                id: 'profile-1',
                agentId: 'agent-1',
                sceneId: 'visionshare',
                l2Data: { existing: 'data' },
            });
            mockPrisma.agentProfile.update.mockResolvedValue({});
            const result = await (0, templateService_1.applyTemplate)('empty-template', 'agent-1', 'user-1');
            expect(result.success).toBe(true);
            expect(result.appliedFields).toEqual([]);
        });
        it('applyTemplate merges with existing l2Data (not overwrites)', async () => {
            mockPrisma.sceneTemplate.findFirst.mockResolvedValue({
                id: 'template-1',
                sceneId: 'visionshare',
                fieldValues: { contentType: ['artwork'] },
            });
            mockPrisma.agentProfile.findFirst.mockResolvedValue({
                id: 'profile-1',
                agentId: 'agent-1',
                sceneId: 'visionshare',
                l2Data: { existingField: 'existingValue' },
            });
            mockPrisma.agentProfile.update.mockResolvedValue({});
            await (0, templateService_1.applyTemplate)('template-1', 'agent-1', 'user-1');
            const updateCall = mockPrisma.agentProfile.update.mock.calls[0][0];
            expect(updateCall.data.l2Data).toEqual({
                existingField: 'existingValue',
                contentType: ['artwork'],
            });
        });
    });
    // ========================================================================
    // PROBE 4: Template service — scene mismatch
    // ========================================================================
    describe('P4: Template scene mismatch', () => {
        it('getPresetTemplates returns empty for invalid sceneId', async () => {
            const result = await (0, templateService_1.getPresetTemplates)('invalid');
            expect(result).toEqual([]);
        });
        it('getPresetTemplates returns all preset templates for valid scene', async () => {
            const result = await (0, templateService_1.getPresetTemplates)('visionshare');
            expect(result.length).toBeGreaterThan(0);
            expect(result.every(function (t) { return t.isPreset === true; })).toBe(true);
        });
        it('searchTemplates ignores sceneId when not provided in options', async () => {
            mockPrisma.sceneTemplate.findMany.mockResolvedValue([]);
            mockPrisma.sceneTemplate.count.mockResolvedValue(0);
            await (0, templateService_1.searchTemplates)('test');
            const call = mockPrisma.sceneTemplate.findMany.mock.calls[0][0];
            expect(call.where.isPublic).toBe(true);
        });
        it('searchTemplates with sceneId option restricts to that scene', async () => {
            mockPrisma.sceneTemplate.findMany.mockResolvedValue([]);
            mockPrisma.sceneTemplate.count.mockResolvedValue(0);
            await (0, templateService_1.searchTemplates)('test', { sceneId: 'visionshare' });
            const call = mockPrisma.sceneTemplate.findMany.mock.calls[0][0];
            expect(call.where.sceneId).toBe('visionshare');
        });
    });
    // ========================================================================
    // PROBE 5: Template CRUD — preset template modification attempt
    // BUG: preset templates (isPreset=true) can be updated and deleted by owner
    // ========================================================================
    describe('P5: Preset template modification — no protection', () => {
        it('updateTemplate allows updating a preset template (no isPreset guard)', async () => {
            mockPrisma.sceneTemplate.findFirst.mockResolvedValue({
                id: 'preset-template-1',
                userId: 'system',
                sceneId: 'visionshare',
                name: 'Original Preset',
                description: 'Desc',
                isPreset: true,
                isDefault: false,
                fieldValues: {},
                isPublic: true,
                usageCount: 100,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            mockPrisma.sceneTemplate.update.mockResolvedValue({
                id: 'preset-template-1',
                userId: 'system',
                sceneId: 'visionshare',
                name: 'Modified Preset',
                description: 'Desc',
                isPreset: true,
                isDefault: false,
                fieldValues: {},
                isPublic: true,
                usageCount: 100,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            const result = await (0, templateService_1.updateTemplate)('preset-template-1', 'system', {
                name: 'Modified Preset',
            });
            expect(result).not.toBeNull();
            expect(mockPrisma.sceneTemplate.update).toHaveBeenCalled();
        });
        it('deleteTemplate allows deleting a preset template (no isPreset guard)', async () => {
            mockPrisma.sceneTemplate.findFirst.mockResolvedValue({
                id: 'preset-template-1',
                userId: 'system',
                sceneId: 'visionshare',
            });
            mockPrisma.sceneTemplate.delete.mockResolvedValue({});
            const result = await (0, templateService_1.deleteTemplate)('preset-template-1', 'system');
            expect(result).toBe(true);
            expect(mockPrisma.sceneTemplate.delete).toHaveBeenCalled();
        });
        it('setDefaultTemplate returns false when template not found for user', async () => {
            mockPrisma.sceneTemplate.updateMany.mockResolvedValue({ count: 0 });
            const result = await (0, templateService_1.setDefaultTemplate)('template-1', 'wrong-user', 'visionshare');
            expect(result).toBe(false);
        });
        it('duplicateTemplate appends (复制) suffix to name', async () => {
            mockPrisma.sceneTemplate.findFirst.mockResolvedValue({
                id: 'template-1',
                userId: 'user-1',
                sceneId: 'visionshare',
                name: 'Original',
                description: 'Desc',
                isPreset: false,
                isDefault: false,
                fieldValues: {},
                isPublic: false,
                usageCount: 5,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            mockPrisma.sceneTemplate.create.mockResolvedValue({
                id: 'template-2',
                userId: 'user-1',
                sceneId: 'visionshare',
                name: 'Original (复制)',
                description: 'Desc',
                isPreset: false,
                isDefault: false,
                fieldValues: {},
                isPublic: false,
                usageCount: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            const result = await (0, templateService_1.duplicateTemplate)('template-1', 'user-1');
            expect(result.name).toContain('复制');
        });
    });
    // ========================================================================
    // PROBE 6: Migration — data integrity and edge cases
    // ========================================================================
    describe('P6: Migration service edge cases', () => {
        it('previewMigration with non-existent profile throws', async () => {
            mockPrisma.agentProfile.findFirst.mockResolvedValue(null);
            await expect((0, sceneMigrationService_1.previewMigration)('nonexistent-agent', 'visionshare', 'agentdate')).rejects.toThrow('Agent profile not found');
        });
        it('executeMigration with non-existent agent throws', async () => {
            mockPrisma.agentProfile.findFirst.mockResolvedValueOnce({ id: 'p1', agentId: 'a1', sceneId: 'visionshare', l2Data: {} });
            mockPrisma.agent.findUnique.mockResolvedValue(null);
            await expect((0, sceneMigrationService_1.executeMigration)('a1', 'visionshare', 'agentdate')).rejects.toThrow('Agent not found');
        });
        it('executeMigration creates new profile when target profile absent', async () => {
            mockPrisma.agentProfile.findFirst
                .mockResolvedValueOnce({ id: 'p1', agentId: 'a1', sceneId: 'visionshare', l2Data: { test: 'value' } });
            mockPrisma.agent.findUnique.mockResolvedValue({ id: 'a1', userId: 'u1' });
            mockPrisma.agentProfile.findFirst.mockResolvedValueOnce(null);
            mockPrisma.agentProfile.create.mockResolvedValue({ id: 'p2', agentId: 'a1', sceneId: 'agentdate', l2Data: {} });
            const result = await (0, sceneMigrationService_1.executeMigration)('a1', 'visionshare', 'agentdate');
            expect(result.success).toBe(true);
            expect(mockPrisma.agentProfile.create).toHaveBeenCalled();
        });
        it('executeMigration updates existing target profile', async () => {
            mockPrisma.agentProfile.findFirst
                .mockResolvedValueOnce({ id: 'p1', agentId: 'a1', sceneId: 'visionshare', l2Data: {} });
            mockPrisma.agent.findUnique.mockResolvedValue({ id: 'a1', userId: 'u1' });
            mockPrisma.agentProfile.findFirst.mockResolvedValueOnce({ id: 'p2', agentId: 'a1', sceneId: 'agentdate', l2Data: {} });
            mockPrisma.agentProfile.update.mockResolvedValue({ id: 'p2', agentId: 'a1', sceneId: 'agentdate', l2Data: {} });
            const result = await (0, sceneMigrationService_1.executeMigration)('a1', 'visionshare', 'agentdate');
            expect(result.success).toBe(true);
            expect(mockPrisma.agentProfile.update).toHaveBeenCalled();
        });
        it('estimateDataLoss with invalid scenes returns zero-loss sentinel', () => {
            const result = (0, sceneMigrationService_1.estimateDataLoss)('invalid', 'agentdate');
            expect(result.willLoseData).toBe(false);
            expect(result.lossPercentage).toBe(0);
        });
        it('validateMigration rejects invalid source', () => {
            const result = (0, sceneMigrationService_1.validateMigration)('invalid', 'agentdate');
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('source');
        });
        it('validateMigration rejects invalid target', () => {
            const result = (0, sceneMigrationService_1.validateMigration)('visionshare', 'invalid');
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('target');
        });
        it('generateMigrationPlan includes predefined rules when available', () => {
            const plan = (0, sceneMigrationService_1.generateMigrationPlan)('visionshare', 'agentdate');
            expect(plan.fieldMappings.length).toBeGreaterThan(0);
        });
        it('generateMigrationPlan auto-generates for unmapped pairs', () => {
            const plan = (0, sceneMigrationService_1.generateMigrationPlan)('agentdate', 'agentad');
            expect(plan.fieldMappings.length).toBeGreaterThan(0);
        });
    });
    // ========================================================================
    // PROBE 7: Capability version comparison edge cases
    // ========================================================================
    describe('P7: Capability version comparison', () => {
        it('validateCapabilityVersion — exact version match', () => {
            expect((0, sceneCapabilityService_1.validateCapabilityVersion)('visionshare', 'image_upload', '1.0.0')).toBe(true);
        });
        it('validateCapabilityVersion — lower min version passes', () => {
            expect((0, sceneCapabilityService_1.validateCapabilityVersion)('visionshare', 'image_upload', '0.5.0')).toBe(true);
        });
        it('validateCapabilityVersion — higher min version fails', () => {
            expect((0, sceneCapabilityService_1.validateCapabilityVersion)('visionshare', 'image_upload', '2.0.0')).toBe(false);
        });
        it('validateCapabilityVersion — non-existent capability returns false', () => {
            expect((0, sceneCapabilityService_1.validateCapabilityVersion)('visionshare', 'nonexistent', '1.0.0')).toBe(false);
        });
        it('areAllCapabilitiesEnabled — all enabled returns true', () => {
            expect((0, sceneCapabilityService_1.areAllCapabilitiesEnabled)('visionshare', ['image_upload', 'video_upload'])).toBe(true);
        });
        it('areAllCapabilitiesEnabled — one disabled returns false', () => {
            expect((0, sceneCapabilityService_1.areAllCapabilitiesEnabled)('visionshare', ['image_upload', 'marketplace'])).toBe(false);
        });
        it('isAnyCapabilityEnabled — at least one enabled returns true', () => {
            expect((0, sceneCapabilityService_1.isAnyCapabilityEnabled)('visionshare', ['image_upload', 'marketplace'])).toBe(true);
        });
        it('isAnyCapabilityEnabled — all disabled returns false', () => {
            expect((0, sceneCapabilityService_1.isAnyCapabilityEnabled)('visionshare', ['marketplace'])).toBe(false);
        });
        it('getCapabilityConfig returns config for capability that has config (video_upload)', () => {
            const config = (0, sceneCapabilityService_1.getCapabilityConfig)('visionshare', 'video_upload');
            expect(config).toBeDefined();
            expect(typeof config).toBe('object');
        });
        it('getCapabilityConfig returns undefined for capability without config (image_upload)', () => {
            const config = (0, sceneCapabilityService_1.getCapabilityConfig)('visionshare', 'image_upload');
            expect(config).toBeUndefined();
        });
        it('getCapabilityConfig for non-existent returns undefined', () => {
            const config = (0, sceneCapabilityService_1.getCapabilityConfig)('visionshare', 'nonexistent');
            expect(config).toBeUndefined();
        });
    });
    // ========================================================================
    // PROBE 8: Field validation — ageRange mismatch between config and Zod schema
    // ========================================================================
    describe('P8: Scene config vs Zod schema field mismatch', () => {
        it('agentDate preset templates exist and can be retrieved', async () => {
            const templates = await (0, templateService_1.getPresetTemplates)('agentdate');
            expect(templates.length).toBeGreaterThan(0);
        });
        it('generateMigrationPlan from visionshare to agentdate produces a plan', () => {
            const plan = (0, sceneMigrationService_1.generateMigrationPlan)('visionshare', 'agentdate');
            expect(plan).toBeDefined();
        });
    });
    // ========================================================================
    // PROBE 9: Scene registry — runtime registration edge cases
    // ========================================================================
    describe('P9: Scene registry runtime manipulation', () => {
        it('getAllSceneConfigs returns all 4 scenes', () => {
            const configs = (0, shared_1.getAllSceneConfigs)();
            expect(configs.length).toBe(4);
        });
        it('getActiveSceneConfigs filters by isActive', () => {
            const configs = (0, shared_1.getActiveSceneConfigs)();
            configs.forEach(function (c) { expect(c.metadata.isActive).toBe(true); });
        });
        it('getSceneInfo returns lightweight metadata', () => {
            const info = (0, shared_1.getSceneInfo)('visionshare');
            expect(info).not.toBeNull();
            expect(info.fieldCount).toBeGreaterThan(0);
            expect(info.capabilityCount).toBeGreaterThan(0);
        });
        it('getSceneInfo returns null for invalid scene', () => {
            const info = (0, shared_1.getSceneInfo)('invalid');
            expect(info).toBeNull();
        });
    });
    // ========================================================================
    // PROBE 10: getTemplatesByScene — scene filtering
    // ========================================================================
    describe('P10: getTemplatesByScene — scene filtering', () => {
        it('getTemplatesByScene with userId includes sceneId in where clause', async () => {
            mockPrisma.sceneTemplate.findMany.mockResolvedValue([]);
            mockPrisma.sceneTemplate.count.mockResolvedValue(0);
            await (0, templateService_1.getTemplatesByScene)('visionshare', { userId: 'u1' });
            const call = mockPrisma.sceneTemplate.findMany.mock.calls[0][0];
            expect(call.where.sceneId).toBe('visionshare');
        });
        it('getTemplatesByScene — empty result when no templates match', async () => {
            mockPrisma.sceneTemplate.findMany.mockResolvedValue([]);
            mockPrisma.sceneTemplate.count.mockResolvedValue(0);
            const result = await (0, templateService_1.getTemplatesByScene)('visionshare', { userId: 'nobody' });
            expect(result.items).toHaveLength(0);
            expect(result.total).toBe(0);
        });
        it('getTemplatesByScene with userId+includePublic uses OR clause', async () => {
            mockPrisma.sceneTemplate.findMany.mockResolvedValue([]);
            mockPrisma.sceneTemplate.count.mockResolvedValue(0);
            await (0, templateService_1.getTemplatesByScene)('visionshare', { userId: 'u1', includePublic: true });
            const call = mockPrisma.sceneTemplate.findMany.mock.calls[0][0];
            // sceneId is at top level of where, AND the OR branch
            expect(call.where.sceneId).toBe('visionshare');
        });
    });
    // ========================================================================
    // PROBE 11: getCapabilityStatus — edge cases
    // ========================================================================
    describe('P11: getCapabilityStatus edge cases', () => {
        it('getCapabilityStatus — non-existent capability returns all false', () => {
            const status = (0, sceneCapabilityService_1.getCapabilityStatus)('visionshare', 'nonexistent_cap');
            expect(status.enabled).toBe(false);
            expect(status.available).toBe(false);
            expect(status.missingDependencies).toEqual([]);
            expect(status.hasCircularDeps).toBe(false);
        });
        it('getCapabilityStatus — enabled cap with no deps is available', () => {
            const status = (0, sceneCapabilityService_1.getCapabilityStatus)('visionshare', 'image_upload');
            expect(status.enabled).toBe(true);
            expect(status.available).toBe(true);
            expect(status.missingDependencies).toEqual([]);
        });
        it('getCapabilityStatus — disabled cap is not available', () => {
            const status = (0, sceneCapabilityService_1.getCapabilityStatus)('visionshare', 'marketplace');
            expect(status.enabled).toBe(false);
            expect(status.available).toBe(false);
        });
        it('getSceneCapabilitiesSummary — invalid scene returns zeros', () => {
            const summary = (0, sceneCapabilityService_1.getSceneCapabilitiesSummary)('invalid');
            expect(summary.total).toBe(0);
            expect(summary.enabled).toBe(0);
        });
    });
    // ========================================================================
    // PROBE 12: shareTemplate — privacy and idempotency
    // ========================================================================
    describe('P12: shareTemplate and idempotency', () => {
        it('shareTemplate calls updateTemplate with isPublic=true', async () => {
            mockPrisma.sceneTemplate.findFirst.mockResolvedValue({
                id: 'private-template',
                userId: 'user-1',
                sceneId: 'visionshare',
                name: 'Private',
                description: '',
                isPreset: false,
                isDefault: false,
                fieldValues: {},
                isPublic: false,
                usageCount: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            mockPrisma.sceneTemplate.update.mockResolvedValue({
                id: 'private-template',
                userId: 'user-1',
                sceneId: 'visionshare',
                name: 'Private',
                description: '',
                isPreset: false,
                isDefault: false,
                fieldValues: {},
                isPublic: true,
                usageCount: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            const result = await (0, templateService_1.shareTemplate)('private-template', 'user-1');
            expect(result.isPublic).toBe(true);
            const updateCall = mockPrisma.sceneTemplate.update.mock.calls[0][0];
            expect(updateCall.data.isPublic).toBe(true);
        });
        it('shareTemplate of already-public template is idempotent', async () => {
            mockPrisma.sceneTemplate.findFirst.mockResolvedValue({
                id: 'public-template',
                userId: 'user-1',
                sceneId: 'visionshare',
                name: 'Public',
                description: '',
                isPreset: false,
                isDefault: false,
                fieldValues: {},
                isPublic: true,
                usageCount: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            mockPrisma.sceneTemplate.update.mockResolvedValue({
                id: 'public-template',
                userId: 'user-1',
                sceneId: 'visionshare',
                name: 'Public',
                description: '',
                isPreset: false,
                isDefault: false,
                fieldValues: {},
                isPublic: true,
                usageCount: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            const result = await (0, templateService_1.shareTemplate)('public-template', 'user-1');
            expect(result.isPublic).toBe(true);
        });
    });
});
//# sourceMappingURL=probe_C006.test.js.map