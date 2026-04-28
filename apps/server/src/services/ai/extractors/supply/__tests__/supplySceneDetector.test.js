"use strict";
/**
 * Supply Scene Detector Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const supplySceneDetector_1 = require("../supplySceneDetector");
const visionShareSupplyExtractor_1 = require("../visionShareSupplyExtractor");
const jobSupplyExtractor_1 = require("../jobSupplyExtractor");
const adSupplyExtractor_1 = require("../adSupplyExtractor");
describe('SupplySceneDetector', () => {
    let detector;
    beforeEach(() => {
        detector = new supplySceneDetector_1.SupplySceneDetector();
    });
    describe('detectScene', () => {
        it('should detect VisionShare supply scene', async () => {
            const result = await detector.detectScene('我是专业摄影师，8年人像摄影经验，使用佳能5D4');
            expect(result.scene).toBe('visionshare');
            expect(result.confidence).toBeGreaterThan(0.3);
        });
        it('should detect Job supply scene', async () => {
            const result = await detector.detectScene('5年Java开发经验，精通Spring Boot，求职后端开发');
            expect(result.scene).toBe('agentjob');
            expect(result.confidence).toBeGreaterThan(0.3);
        });
        it('should detect Ad supply scene', async () => {
            const result = await detector.detectScene('出售全新iPhone 15 Pro，全国包邮，正品行货');
            expect(result.scene).toBe('agentad');
            expect(result.confidence).toBeGreaterThan(0.3);
        });
        it('should return unknown for non-supply text', async () => {
            const result = await detector.detectScene('今天天气真好，出去散步了');
            expect(result.scene).toBe('unknown');
        });
    });
    describe('getExtractor', () => {
        it('should return VisionShare extractor', () => {
            const ext = detector.getExtractor('visionshare');
            expect(ext).toBeInstanceOf(visionShareSupplyExtractor_1.VisionShareSupplyExtractor);
        });
        it('should return Job extractor', () => {
            const ext = detector.getExtractor('agentjob');
            expect(ext).toBeInstanceOf(jobSupplyExtractor_1.JobSupplyExtractor);
        });
        it('should return Ad extractor', () => {
            const ext = detector.getExtractor('agentad');
            expect(ext).toBeInstanceOf(adSupplyExtractor_1.AdSupplyExtractor);
        });
        it('should return undefined for unknown scene', () => {
            const ext = detector.getExtractor('unknown');
            expect(ext).toBeUndefined();
        });
    });
    describe('getSupportedScenes', () => {
        it('should return all supported scenes', () => {
            const scenes = detector.getSupportedScenes();
            expect(scenes).toContain('visionshare');
            expect(scenes).toContain('agentjob');
            expect(scenes).toContain('agentad');
            expect(scenes).toHaveLength(3);
        });
    });
    describe('isSceneSupported', () => {
        it('should return true for supported scenes', () => {
            expect(detector.isSceneSupported('visionshare')).toBe(true);
            expect(detector.isSceneSupported('agentjob')).toBe(true);
            expect(detector.isSceneSupported('agentad')).toBe(true);
        });
        it('should return false for unknown scene', () => {
            expect(detector.isSceneSupported('unknown')).toBe(false);
        });
    });
    describe('detectAndExtract', () => {
        it('should auto-detect and extract VisionShare supply', async () => {
            const result = await detector.detectAndExtract('专业摄影师，5年婚礼摄影经验，使用佳能相机');
            expect(result).toBeDefined();
            expect(result?.scene).toBe('visionshare');
        });
        it('should auto-detect and extract Job supply', async () => {
            const result = await detector.detectAndExtract('Python开发工程师，3年经验，擅长数据分析');
            expect(result).toBeDefined();
            expect(result?.scene).toBe('agentjob');
        });
        it('should return undefined for unknown text', async () => {
            const result = await detector.detectAndExtract('随便说说');
            expect(result).toBeUndefined();
        });
    });
    describe('singleton instance', () => {
        it('should export a singleton instance', () => {
            expect(supplySceneDetector_1.supplySceneDetector).toBeInstanceOf(supplySceneDetector_1.SupplySceneDetector);
        });
    });
});
//# sourceMappingURL=supplySceneDetector.test.js.map