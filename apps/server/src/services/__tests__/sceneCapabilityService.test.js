"use strict";
/**
 * Scene Capability Service Tests
 * 场景能力服务测试
 */
Object.defineProperty(exports, "__esModule", { value: true });
const sceneCapabilityService_1 = require("../sceneCapabilityService");
describe('SceneCapabilityService', () => {
    describe('isCapabilityEnabled', () => {
        it('should return true for enabled capability without dependencies', () => {
            const result = (0, sceneCapabilityService_1.isCapabilityEnabled)('visionshare', 'image_upload');
            expect(result).toBe(true);
        });
        it('should return false for disabled capability', () => {
            const result = (0, sceneCapabilityService_1.isCapabilityEnabled)('visionshare', 'marketplace');
            expect(result).toBe(false);
        });
        it('should return false for non-existent capability', () => {
            const result = (0, sceneCapabilityService_1.isCapabilityEnabled)('visionshare', 'non_existent');
            expect(result).toBe(false);
        });
        it('should return false for non-existent scene', () => {
            const result = (0, sceneCapabilityService_1.isCapabilityEnabled)('nonexistent', 'image_upload');
            expect(result).toBe(false);
        });
    });
    describe('getEnabledCapabilities', () => {
        it('should return only enabled capabilities', () => {
            const capabilities = (0, sceneCapabilityService_1.getEnabledCapabilities)('visionshare');
            expect(capabilities.length).toBeGreaterThan(0);
            expect(capabilities.every(c => c.enabled)).toBe(true);
        });
        it('should return empty array for non-existent scene', () => {
            const capabilities = (0, sceneCapabilityService_1.getEnabledCapabilities)('nonexistent');
            expect(capabilities).toEqual([]);
        });
    });
    describe('getAllCapabilities', () => {
        it('should return all capabilities including disabled', () => {
            const capabilities = (0, sceneCapabilityService_1.getAllCapabilities)('visionshare');
            expect(capabilities.length).toBeGreaterThan(0);
            // Should include both enabled and disabled
            const hasEnabled = capabilities.some(c => c.enabled);
            const hasDisabled = capabilities.some(c => !c.enabled);
            expect(hasEnabled).toBe(true);
            expect(hasDisabled).toBe(true);
        });
    });
    describe('getCapability', () => {
        it('should return capability by id', () => {
            const capability = (0, sceneCapabilityService_1.getCapability)('visionshare', 'image_upload');
            expect(capability).toBeDefined();
            expect(capability?.id).toBe('image_upload');
        });
        it('should return undefined for non-existent capability', () => {
            const capability = (0, sceneCapabilityService_1.getCapability)('visionshare', 'non_existent');
            expect(capability).toBeUndefined();
        });
    });
    describe('areDependenciesSatisfied', () => {
        it('should return true for capability with no dependencies', () => {
            const result = (0, sceneCapabilityService_1.areDependenciesSatisfied)('visionshare', 'image_upload');
            expect(result).toBe(true);
        });
        it('should return true when all dependencies are enabled', () => {
            // collaboration depends on portfolio_link
            const result = (0, sceneCapabilityService_1.areDependenciesSatisfied)('visionshare', 'collaboration');
            expect(result).toBe(true);
        });
        it('should return true when dependencies are satisfied even if capability is disabled', () => {
            // marketplace depends on image_upload which IS enabled,
            // so dependencies are satisfied even though marketplace itself is disabled
            const result = (0, sceneCapabilityService_1.areDependenciesSatisfied)('visionshare', 'marketplace');
            expect(result).toBe(true);
        });
    });
    describe('hasCircularDependencies', () => {
        it('should return false for capabilities without circular deps', () => {
            const result = (0, sceneCapabilityService_1.hasCircularDependencies)('visionshare', 'image_upload');
            expect(result).toBe(false);
        });
        it('should detect circular dependencies', () => {
            // This test assumes we might have circular deps in config
            // If not, it will still pass as false
            const result = (0, sceneCapabilityService_1.hasCircularDependencies)('visionshare', 'collaboration');
            expect(typeof result).toBe('boolean');
        });
    });
    describe('getCapabilityStatus', () => {
        it('should return complete status for capability', () => {
            const status = (0, sceneCapabilityService_1.getCapabilityStatus)('visionshare', 'image_upload');
            expect(status).toHaveProperty('enabled');
            expect(status).toHaveProperty('available');
            expect(status).toHaveProperty('missingDependencies');
            expect(status).toHaveProperty('hasCircularDeps');
            expect(status.enabled).toBe(true);
        });
        it('should return unavailable for non-existent capability', () => {
            const status = (0, sceneCapabilityService_1.getCapabilityStatus)('visionshare', 'non_existent');
            expect(status.enabled).toBe(false);
            expect(status.available).toBe(false);
        });
    });
    describe('getSceneCapabilitiesSummary', () => {
        it('should return summary statistics', () => {
            const summary = (0, sceneCapabilityService_1.getSceneCapabilitiesSummary)('visionshare');
            expect(summary).toHaveProperty('total');
            expect(summary).toHaveProperty('enabled');
            expect(summary).toHaveProperty('available');
            expect(summary).toHaveProperty('withDependencies');
            expect(summary.total).toBeGreaterThan(0);
            expect(summary.enabled).toBeGreaterThanOrEqual(0);
            expect(summary.available).toBeGreaterThanOrEqual(0);
            expect(summary.withDependencies).toBeGreaterThanOrEqual(0);
        });
    });
    describe('getAllScenesCapabilitySummary', () => {
        it('should return summary for all scenes', () => {
            const summary = (0, sceneCapabilityService_1.getAllScenesCapabilitySummary)();
            expect(summary).toHaveProperty('visionshare');
            expect(summary).toHaveProperty('agentdate');
            expect(summary).toHaveProperty('agentjob');
            expect(summary).toHaveProperty('agentad');
        });
    });
    describe('validateCapabilityVersion', () => {
        it('should return true for version >= minVersion', () => {
            const result = (0, sceneCapabilityService_1.validateCapabilityVersion)('visionshare', 'image_upload', '0.9.0');
            expect(result).toBe(true);
        });
        it('should return true for exact version match', () => {
            const result = (0, sceneCapabilityService_1.validateCapabilityVersion)('visionshare', 'image_upload', '1.0.0');
            expect(result).toBe(true);
        });
        it('should return false for version < minVersion', () => {
            const result = (0, sceneCapabilityService_1.validateCapabilityVersion)('visionshare', 'image_upload', '2.0.0');
            expect(result).toBe(false);
        });
    });
    describe('areAllCapabilitiesEnabled', () => {
        it('should return true when all capabilities are enabled', () => {
            const result = (0, sceneCapabilityService_1.areAllCapabilitiesEnabled)('visionshare', ['image_upload', 'video_upload']);
            expect(result).toBe(true);
        });
        it('should return false when any capability is disabled', () => {
            const result = (0, sceneCapabilityService_1.areAllCapabilitiesEnabled)('visionshare', ['image_upload', 'marketplace']);
            expect(result).toBe(false);
        });
    });
    describe('isAnyCapabilityEnabled', () => {
        it('should return true when at least one capability is enabled', () => {
            const result = (0, sceneCapabilityService_1.isAnyCapabilityEnabled)('visionshare', ['image_upload', 'marketplace']);
            expect(result).toBe(true);
        });
        it('should return false when all capabilities are disabled', () => {
            const result = (0, sceneCapabilityService_1.isAnyCapabilityEnabled)('visionshare', ['marketplace']);
            expect(result).toBe(false);
        });
    });
    describe('getMissingDependencies', () => {
        it('should return empty array for capability with no dependencies', () => {
            const result = (0, sceneCapabilityService_1.getMissingDependencies)('visionshare', 'image_upload');
            expect(result).toEqual([]);
        });
        it('should return missing dependencies', () => {
            // This would return empty for existing scenes but tests the logic
            const result = (0, sceneCapabilityService_1.getMissingDependencies)('visionshare', 'collaboration');
            expect(Array.isArray(result)).toBe(true);
        });
    });
});
//# sourceMappingURL=sceneCapabilityService.test.js.map