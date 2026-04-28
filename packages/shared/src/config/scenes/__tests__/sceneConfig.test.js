"use strict";
/**
 * Scene Configuration Tests
 * 场景配置测试
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
describe('Scene Configurations', () => {
    describe('Scene Config Exports', () => {
        it('should export all four scene configs', () => {
            expect(index_1.visionShareConfig).toBeDefined();
            expect(index_1.agentDateConfig).toBeDefined();
            expect(index_1.agentJobConfig).toBeDefined();
            expect(index_1.agentAdConfig).toBeDefined();
        });
        it('should have correct scene IDs', () => {
            expect(index_1.visionShareConfig.id).toBe('visionshare');
            expect(index_1.agentDateConfig.id).toBe('agentdate');
            expect(index_1.agentJobConfig.id).toBe('agentjob');
            expect(index_1.agentAdConfig.id).toBe('agentad');
        });
    });
    describe('VisionShare Config', () => {
        it('should have valid metadata', () => {
            expect(index_1.visionShareConfig.metadata).toMatchObject({
                id: 'visionshare',
                name: '视觉分享',
                nameEn: 'VisionShare',
                isActive: true,
            });
            expect(index_1.visionShareConfig.metadata.icon).toBeDefined();
            expect(index_1.visionShareConfig.metadata.color).toBeDefined();
        });
        it('should have fields defined', () => {
            expect(index_1.visionShareConfig.fields.length).toBeGreaterThan(0);
            expect(index_1.visionShareConfig.fields.every((f) => f.id && f.name && f.type)).toBe(true);
        });
        it('should have capabilities defined', () => {
            expect(index_1.visionShareConfig.capabilities.length).toBeGreaterThan(0);
        });
        it('should have templates defined', () => {
            expect(index_1.visionShareConfig.templates.length).toBeGreaterThan(0);
        });
        it('should have UI config', () => {
            expect(index_1.visionShareConfig.ui.sections.length).toBeGreaterThan(0);
            expect(index_1.visionShareConfig.ui.layout).toBeDefined();
        });
    });
    describe('AgentDate Config', () => {
        it('should have valid metadata', () => {
            expect(index_1.agentDateConfig.metadata).toMatchObject({
                id: 'agentdate',
                name: 'Agent约会',
                nameEn: 'AgentDate',
                isActive: true,
            });
        });
        it('should have dating-specific fields', () => {
            const fieldNames = index_1.agentDateConfig.fields.map((f) => f.name);
            expect(fieldNames).toContain('datingPurpose');
            expect(fieldNames).toContain('preferredGender');
            expect(fieldNames).toContain('ageRange');
            expect(fieldNames).toContain('aboutMe');
        });
    });
    describe('AgentJob Config', () => {
        it('should have valid metadata', () => {
            expect(index_1.agentJobConfig.metadata).toMatchObject({
                id: 'agentjob',
                name: 'Agent求职',
                nameEn: 'AgentJob',
                isActive: true,
            });
        });
        it('should have job-specific fields', () => {
            const fieldNames = index_1.agentJobConfig.fields.map((f) => f.name);
            expect(fieldNames).toContain('jobType');
            expect(fieldNames).toContain('jobCategory');
            expect(fieldNames).toContain('targetPositions');
            expect(fieldNames).toContain('skills');
        });
    });
    describe('AgentAd Config', () => {
        it('should have valid metadata', () => {
            expect(index_1.agentAdConfig.metadata).toMatchObject({
                id: 'agentad',
                name: 'Agent广告',
                nameEn: 'AgentAd',
                isActive: true,
            });
        });
        it('should have ad-specific fields', () => {
            const fieldNames = index_1.agentAdConfig.fields.map((f) => f.name);
            expect(fieldNames).toContain('adType');
            expect(fieldNames).toContain('productCategory');
            expect(fieldNames).toContain('targetAudience');
            expect(fieldNames).toContain('campaignObjective');
        });
    });
    describe('getSceneConfig', () => {
        it('should return config for valid scene', () => {
            expect((0, index_1.getSceneConfig)('visionshare')).toBeDefined();
            expect((0, index_1.getSceneConfig)('agentdate')).toBeDefined();
            expect((0, index_1.getSceneConfig)('agentjob')).toBeDefined();
            expect((0, index_1.getSceneConfig)('agentad')).toBeDefined();
        });
        it('should return undefined for invalid scene', () => {
            expect((0, index_1.getSceneConfig)('invalid')).toBeUndefined();
        });
    });
    describe('getAllSceneConfigs', () => {
        it('should return all scene configs', () => {
            const configs = (0, index_1.getAllSceneConfigs)();
            expect(configs).toHaveLength(4);
            expect(configs.some((c) => c.id === 'visionshare')).toBe(true);
            expect(configs.some((c) => c.id === 'agentdate')).toBe(true);
            expect(configs.some((c) => c.id === 'agentjob')).toBe(true);
            expect(configs.some((c) => c.id === 'agentad')).toBe(true);
        });
    });
    describe('getActiveSceneConfigs', () => {
        it('should return only active scenes', () => {
            const configs = (0, index_1.getActiveSceneConfigs)();
            expect(configs.every((c) => c.metadata.isActive)).toBe(true);
        });
    });
    describe('getSceneInfo', () => {
        it('should return scene info for valid scene', () => {
            const info = (0, index_1.getSceneInfo)('visionshare');
            expect(info).toBeDefined();
            expect(info?.id).toBe('visionshare');
            expect(info?.name).toBeDefined();
            expect(info?.fieldCount).toBeGreaterThan(0);
            expect(info?.capabilityCount).toBeGreaterThan(0);
        });
        it('should return null for invalid scene', () => {
            expect((0, index_1.getSceneInfo)('invalid')).toBeNull();
        });
    });
    describe('getAllSceneInfos', () => {
        it('should return info for all scenes', () => {
            const infos = (0, index_1.getAllSceneInfos)();
            expect(infos).toHaveLength(4);
        });
    });
    describe('hasScene', () => {
        it('should return true for valid scenes', () => {
            expect((0, index_1.hasScene)('visionshare')).toBe(true);
            expect((0, index_1.hasScene)('agentdate')).toBe(true);
            expect((0, index_1.hasScene)('agentjob')).toBe(true);
            expect((0, index_1.hasScene)('agentad')).toBe(true);
        });
        it('should return false for invalid scene', () => {
            expect((0, index_1.hasScene)('invalid')).toBe(false);
        });
    });
});
//# sourceMappingURL=sceneConfig.test.js.map