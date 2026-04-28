/**
 * 积分规则引擎
 * 处理积分规则的校验、计算和执行
 */
import { PrismaClient } from '@prisma/client';
import { SceneCode } from '@bridgeai/shared';
import { PointsRule } from '../config/pointsRules';
export interface RuleValidationResult {
    valid: boolean;
    rule?: PointsRule;
    points: number;
    error?: string;
}
export interface LimitCheckContext {
    userId: string;
    ruleCode: string;
    amount?: number;
}
export interface LimitCheckResult {
    allowed: boolean;
    currentDailyCount: number;
    currentWeeklyCount: number;
    remainingDaily: number;
    remainingWeekly: number;
    error?: string;
}
export interface PointsCalculationContext {
    userId: string;
    ruleCode: string;
    baseAmount?: number;
    metadata?: Record<string, unknown>;
}
export declare class PointsRuleEngine {
    private prisma;
    constructor(prismaClient?: PrismaClient);
    /**
     * 验证并获取规则
     */
    validateRule(ruleCode: string): RuleValidationResult;
    /**
     * 检查限制（每日/每周上限）
     */
    checkLimits(context: LimitCheckContext): Promise<LimitCheckResult>;
    /**
     * 计算积分（根据规则和上下文）
     */
    calculatePoints(context: PointsCalculationContext): Promise<number>;
    /**
     * 检查全局每日/每周获取限制
     */
    checkGlobalEarnLimits(userId: string, amount: number): Promise<boolean>;
    /**
     * 检查全局每日/每周消耗限制
     */
    checkGlobalSpendLimits(userId: string, amount: number): Promise<boolean>;
    /**
     * 验证转账参数
     */
    validateTransfer(fromUserId: string, toUserId: string, amount: number): {
        valid: boolean;
        fee: number;
        error?: string;
    };
    /**
     * 验证冻结参数
     */
    validateFreeze(accountBalance: number, currentFrozen: number, freezeAmount: number): {
        valid: boolean;
        error?: string;
    };
    /**
     * 获取所有可用规则
     */
    getAllRules(): PointsRule[];
    /**
     * 获取场景规则
     */
    getRulesByScene(scene: SceneCode): PointsRule[];
    /**
     * 获取规则详情
     */
    getRuleDetail(ruleCode: string): PointsRule | undefined;
}
export declare const pointsRuleEngine: PointsRuleEngine;
//# sourceMappingURL=pointsRuleEngine.d.ts.map