"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const creditLevels_1 = require("../creditLevels");
const credit_1 = require("../../types/credit");
describe('CreditLevels Config', () => {
    describe('getCreditLevel', () => {
        it('should return EXCELLENT for scores 900-1000', () => {
            expect((0, creditLevels_1.getCreditLevel)(900)).toBe(credit_1.CreditLevel.EXCELLENT);
            expect((0, creditLevels_1.getCreditLevel)(950)).toBe(credit_1.CreditLevel.EXCELLENT);
            expect((0, creditLevels_1.getCreditLevel)(1000)).toBe(credit_1.CreditLevel.EXCELLENT);
        });
        it('should return GOOD for scores 750-899', () => {
            expect((0, creditLevels_1.getCreditLevel)(750)).toBe(credit_1.CreditLevel.GOOD);
            expect((0, creditLevels_1.getCreditLevel)(800)).toBe(credit_1.CreditLevel.GOOD);
            expect((0, creditLevels_1.getCreditLevel)(899)).toBe(credit_1.CreditLevel.GOOD);
        });
        it('should return GENERAL for scores 600-749', () => {
            expect((0, creditLevels_1.getCreditLevel)(600)).toBe(credit_1.CreditLevel.GENERAL);
            expect((0, creditLevels_1.getCreditLevel)(700)).toBe(credit_1.CreditLevel.GENERAL);
            expect((0, creditLevels_1.getCreditLevel)(749)).toBe(credit_1.CreditLevel.GENERAL);
        });
        it('should return POOR for scores below 600', () => {
            expect((0, creditLevels_1.getCreditLevel)(599)).toBe(credit_1.CreditLevel.POOR);
            expect((0, creditLevels_1.getCreditLevel)(500)).toBe(credit_1.CreditLevel.POOR);
            expect((0, creditLevels_1.getCreditLevel)(0)).toBe(credit_1.CreditLevel.POOR);
        });
    });
    describe('getCreditLevelConfig', () => {
        it('should return config for each level', () => {
            Object.values(credit_1.CreditLevel).forEach(level => {
                const config = (0, creditLevels_1.getCreditLevelConfig)(level);
                expect(config).toBeDefined();
                expect(config.level).toBe(level);
                expect(config.name).toBeDefined();
                expect(config.benefits).toBeInstanceOf(Array);
                expect(config.restrictions).toBeInstanceOf(Array);
            });
        });
        it('should throw error for invalid level', () => {
            expect(() => (0, creditLevels_1.getCreditLevelConfig)('invalid')).toThrow();
        });
    });
    describe('getCreditLevelConfigByScore', () => {
        it('should return correct config based on score', () => {
            const excellentConfig = (0, creditLevels_1.getCreditLevelConfigByScore)(950);
            expect(excellentConfig.level).toBe(credit_1.CreditLevel.EXCELLENT);
            const goodConfig = (0, creditLevels_1.getCreditLevelConfigByScore)(800);
            expect(goodConfig.level).toBe(credit_1.CreditLevel.GOOD);
            const generalConfig = (0, creditLevels_1.getCreditLevelConfigByScore)(650);
            expect(generalConfig.level).toBe(credit_1.CreditLevel.GENERAL);
            const poorConfig = (0, creditLevels_1.getCreditLevelConfigByScore)(500);
            expect(poorConfig.level).toBe(credit_1.CreditLevel.POOR);
        });
    });
    describe('getLevelBadge', () => {
        it('should return badge info for each level', () => {
            Object.values(credit_1.CreditLevel).forEach(level => {
                const badge = (0, creditLevels_1.getLevelBadge)(level);
                expect(badge).toBeDefined();
                expect(badge.name).toBeDefined();
                expect(badge.color).toBeDefined();
                expect(badge.icon).toBeDefined();
            });
        });
    });
    describe('CREDIT_LEVEL_RANGES', () => {
        it('should have correct score ranges', () => {
            expect(creditLevels_1.CREDIT_LEVEL_RANGES[credit_1.CreditLevel.EXCELLENT]).toEqual({ min: 900, max: 1000 });
            expect(creditLevels_1.CREDIT_LEVEL_RANGES[credit_1.CreditLevel.GOOD]).toEqual({ min: 750, max: 899 });
            expect(creditLevels_1.CREDIT_LEVEL_RANGES[credit_1.CreditLevel.GENERAL]).toEqual({ min: 600, max: 749 });
            expect(creditLevels_1.CREDIT_LEVEL_RANGES[credit_1.CreditLevel.POOR]).toEqual({ min: 0, max: 599 });
        });
    });
    describe('CREDIT_LEVEL_BENEFITS', () => {
        it('should have benefits for each level', () => {
            expect(creditLevels_1.CREDIT_LEVEL_BENEFITS).toHaveLength(4);
            creditLevels_1.CREDIT_LEVEL_BENEFITS.forEach(config => {
                expect(config.level).toBeDefined();
                expect(config.name).toBeDefined();
                expect(config.minScore).toBeDefined();
                expect(config.maxScore).toBeDefined();
                expect(config.benefits).toBeInstanceOf(Array);
                expect(config.restrictions).toBeInstanceOf(Array);
            });
        });
        it('should have more benefits for higher levels', () => {
            const excellentBenefits = creditLevels_1.CREDIT_LEVEL_BENEFITS.find(b => b.level === credit_1.CreditLevel.EXCELLENT).benefits.length;
            const goodBenefits = creditLevels_1.CREDIT_LEVEL_BENEFITS.find(b => b.level === credit_1.CreditLevel.GOOD).benefits.length;
            const generalBenefits = creditLevels_1.CREDIT_LEVEL_BENEFITS.find(b => b.level === credit_1.CreditLevel.GENERAL).benefits.length;
            const poorBenefits = creditLevels_1.CREDIT_LEVEL_BENEFITS.find(b => b.level === credit_1.CreditLevel.POOR).benefits.length;
            expect(excellentBenefits).toBeGreaterThan(goodBenefits);
            expect(goodBenefits).toBeGreaterThan(generalBenefits);
            expect(generalBenefits).toBeGreaterThanOrEqual(poorBenefits);
        });
        it('should have restrictions only for lower levels', () => {
            const excellent = creditLevels_1.CREDIT_LEVEL_BENEFITS.find(b => b.level === credit_1.CreditLevel.EXCELLENT);
            const good = creditLevels_1.CREDIT_LEVEL_BENEFITS.find(b => b.level === credit_1.CreditLevel.GOOD);
            const general = creditLevels_1.CREDIT_LEVEL_BENEFITS.find(b => b.level === credit_1.CreditLevel.GENERAL);
            const poor = creditLevels_1.CREDIT_LEVEL_BENEFITS.find(b => b.level === credit_1.CreditLevel.POOR);
            expect(excellent.restrictions).toHaveLength(0);
            expect(good.restrictions).toHaveLength(0);
            expect(general.restrictions.length).toBeGreaterThan(0);
            expect(poor.restrictions.length).toBeGreaterThan(general.restrictions.length);
        });
    });
});
//# sourceMappingURL=creditLevels.test.js.map