"use strict";
/**
 * Mutual Consent Model Tests
 * 双向同意状态管理模型测试
 */
Object.defineProperty(exports, "__esModule", { value: true });
const MutualConsent_1 = require("../../models/MutualConsent");
describe('MutualConsent Model', () => {
    describe('createMutualConsent', () => {
        it('should create a new mutual consent record', () => {
            const consent = (0, MutualConsent_1.createMutualConsent)('ref_123', 'user_a', 'user_b');
            expect(consent).toBeDefined();
            expect(consent.referralId).toBe('ref_123');
            expect(consent.userAId).toBe('user_a');
            expect(consent.userBId).toBe('user_b');
            expect(consent.result).toBe(MutualConsent_1.ReferralResult.PENDING);
        });
        it('should initialize both users with PENDING status', () => {
            const consent = (0, MutualConsent_1.createMutualConsent)('ref_123', 'user_a', 'user_b');
            expect(consent.userAConsent.status).toBe(MutualConsent_1.ConsentStatus.PENDING);
            expect(consent.userBConsent.status).toBe(MutualConsent_1.ConsentStatus.PENDING);
            expect(consent.userAConsent.changedCount).toBe(0);
            expect(consent.userBConsent.changedCount).toBe(0);
        });
        it('should set expiration time correctly', () => {
            const consent = (0, MutualConsent_1.createMutualConsent)('ref_123', 'user_a', 'user_b', {
                defaultTimeoutHours: 72,
            });
            const expectedExpiry = new Date(consent.createdAt.getTime() + 72 * 60 * 60 * 1000);
            expect(consent.expiresAt.getTime()).toBeCloseTo(expectedExpiry.getTime(), -2);
        });
    });
    describe('updateUserDecision', () => {
        let consent;
        beforeEach(() => {
            consent = (0, MutualConsent_1.createMutualConsent)('ref_123', 'user_a', 'user_b');
        });
        it('should update user A decision to ACCEPTED', () => {
            const updated = (0, MutualConsent_1.updateUserDecision)(consent, 'user_a', 'accept');
            expect(updated.userAConsent.status).toBe(MutualConsent_1.ConsentStatus.ACCEPTED);
            expect(updated.userAConsent.decidedAt).toBeInstanceOf(Date);
        });
        it('should update user B decision to REJECTED', () => {
            const updated = (0, MutualConsent_1.updateUserDecision)(consent, 'user_b', 'reject', 'not_interested');
            expect(updated.userBConsent.status).toBe(MutualConsent_1.ConsentStatus.REJECTED);
            expect(updated.userBConsent.reason).toBe('not_interested');
        });
        it('should throw error when consent has expired', () => {
            // 创建一个已过期的同意记录
            const expiredConsent = {
                ...consent,
                expiresAt: new Date(Date.now() - 1000),
            };
            expect(() => (0, MutualConsent_1.updateUserDecision)(expiredConsent, 'user_a', 'accept'))
                .toThrow(MutualConsent_1.ConsentExpiredError);
        });
        it('should allow decision change within limit', () => {
            // 先做出决策
            let updated = (0, MutualConsent_1.updateUserDecision)(consent, 'user_a', 'accept');
            expect(updated.userAConsent.changedCount).toBe(0);
            // 修改决策
            updated = (0, MutualConsent_1.updateUserDecision)(updated, 'user_a', 'reject');
            expect(updated.userAConsent.changedCount).toBe(1);
            expect(updated.userAConsent.status).toBe(MutualConsent_1.ConsentStatus.REJECTED);
        });
        it('should throw error when change limit exceeded', () => {
            // 模拟已达到变更次数限制
            const limitedConsent = {
                ...consent,
                userAConsent: {
                    ...consent.userAConsent,
                    status: MutualConsent_1.ConsentStatus.ACCEPTED,
                    changedCount: 3,
                },
            };
            expect(() => (0, MutualConsent_1.updateUserDecision)(limitedConsent, 'user_a', 'reject'))
                .toThrow(MutualConsent_1.ConsentChangeLimitError);
        });
    });
    describe('expireConsent', () => {
        it('should mark pending users as EXPIRED', () => {
            const consent = (0, MutualConsent_1.createMutualConsent)('ref_123', 'user_a', 'user_b');
            // 用户A已决策，用户B未决策
            let updated = (0, MutualConsent_1.updateUserDecision)(consent, 'user_a', 'accept');
            updated = {
                ...updated,
                expiresAt: new Date(Date.now() - 1000), // 已过期
            };
            const expired = (0, MutualConsent_1.expireConsent)(updated);
            expect(expired.userAConsent.status).toBe(MutualConsent_1.ConsentStatus.ACCEPTED); // 保持不变
            expect(expired.userBConsent.status).toBe(MutualConsent_1.ConsentStatus.EXPIRED);
            expect(expired.result).toBe(MutualConsent_1.ReferralResult.EXPIRED);
        });
    });
    describe('isBothDecided', () => {
        it('should return false when one user has not decided', () => {
            const consent = (0, MutualConsent_1.createMutualConsent)('ref_123', 'user_a', 'user_b');
            const updated = (0, MutualConsent_1.updateUserDecision)(consent, 'user_a', 'accept');
            expect((0, MutualConsent_1.isBothDecided)(updated)).toBe(false);
        });
        it('should return true when both users have decided', () => {
            let consent = (0, MutualConsent_1.createMutualConsent)('ref_123', 'user_a', 'user_b');
            consent = (0, MutualConsent_1.updateUserDecision)(consent, 'user_a', 'accept');
            consent = (0, MutualConsent_1.updateUserDecision)(consent, 'user_b', 'accept');
            expect((0, MutualConsent_1.isBothDecided)(consent)).toBe(true);
        });
    });
    describe('isMutualAccept', () => {
        it('should return true when both users accept', () => {
            let consent = (0, MutualConsent_1.createMutualConsent)('ref_123', 'user_a', 'user_b');
            consent = (0, MutualConsent_1.updateUserDecision)(consent, 'user_a', 'accept');
            consent = (0, MutualConsent_1.updateUserDecision)(consent, 'user_b', 'accept');
            expect((0, MutualConsent_1.isMutualAccept)(consent)).toBe(true);
        });
        it('should return false when one user rejects', () => {
            let consent = (0, MutualConsent_1.createMutualConsent)('ref_123', 'user_a', 'user_b');
            consent = (0, MutualConsent_1.updateUserDecision)(consent, 'user_a', 'accept');
            consent = (0, MutualConsent_1.updateUserDecision)(consent, 'user_b', 'reject');
            expect((0, MutualConsent_1.isMutualAccept)(consent)).toBe(false);
        });
    });
});
//# sourceMappingURL=mutualConsent.test.js.map