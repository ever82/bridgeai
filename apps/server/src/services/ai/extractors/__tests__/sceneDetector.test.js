"use strict";
/**
 * Scene Detector Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const sceneDetector_1 = require("../sceneDetector");
const visionShareExtractor_1 = require("../visionShareExtractor");
const agentDateExtractor_1 = require("../agentDateExtractor");
describe('SceneDetector', () => {
    let detector;
    beforeEach(() => {
        detector = new sceneDetector_1.SceneDetector();
    });
    describe('detectScene', () => {
        it('should detect VisionShare scene', async () => {
            const result = await detector.detectScene('需要专业摄影师拍摄婚纱照');
            expect(result.scene).toBe('visionshare');
            expect(result.confidence).toBeGreaterThan(0.5);
        });
        it('should detect AgentDate scene', async () => {
            const result = await detector.detectScene('想找一位合适的伴侣相亲');
            expect(result.scene).toBe('agentdate');
            expect(result.confidence).toBeGreaterThan(0.5);
        });
        it('should detect AgentJob scene', async () => {
            const result = await detector.detectScene('想找一份Java开发工作');
            expect(result.scene).toBe('agentjob');
            expect(result.confidence).toBeGreaterThan(0.5);
        });
        it('should detect AgentAd scene', async () => {
            const result = await detector.detectScene('想买一部iPhone手机');
            expect(result.scene).toBe('agentad');
            expect(result.confidence).toBeGreaterThan(0.5);
        });
        it('should return unknown for unrelated text', async () => {
            const result = await detector.detectScene('今天天气不错');
            expect(result.scene).toBe('unknown');
            expect(result.confidence).toBe(0);
        });
    });
    describe('detectAllScenes', () => {
        it('should return all matching scenes', async () => {
            const results = await detector.detectAllScenes('想找一份能发挥摄影技能的工作');
            expect(results.length).toBeGreaterThan(0);
        });
    });
    describe('getExtractor', () => {
        it('should return extractor for VisionShare', () => {
            const extractor = detector.getExtractor('visionshare');
            expect(extractor).toBeInstanceOf(visionShareExtractor_1.VisionShareExtractor);
        });
        it('should return extractor for AgentDate', () => {
            const extractor = detector.getExtractor('agentdate');
            expect(extractor).toBeInstanceOf(agentDateExtractor_1.AgentDateExtractor);
        });
        it('should return undefined for unknown scene', () => {
            const extractor = detector.getExtractor('unknown');
            expect(extractor).toBeUndefined();
        });
    });
    describe('getSupportedScenes', () => {
        it('should return all supported scenes', () => {
            const scenes = detector.getSupportedScenes();
            expect(scenes).toContain('visionshare');
            expect(scenes).toContain('agentdate');
            expect(scenes).toContain('agentjob');
            expect(scenes).toContain('agentad');
        });
    });
    describe('isSceneSupported', () => {
        it('should return true for supported scenes', () => {
            expect(detector.isSceneSupported('visionshare')).toBe(true);
            expect(detector.isSceneSupported('agentdate')).toBe(true);
        });
        it('should return false for unknown scene', () => {
            expect(detector.isSceneSupported('unknown')).toBe(false);
        });
    });
    describe('getExtractorForText', () => {
        it('should return appropriate extractor for text', async () => {
            const extractor = await detector.getExtractorForText('需要摄影服务');
            expect(extractor).toBeInstanceOf(visionShareExtractor_1.VisionShareExtractor);
        });
    });
});
//# sourceMappingURL=sceneDetector.test.js.map