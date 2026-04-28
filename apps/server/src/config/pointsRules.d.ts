/**
 * 积分规则配置
 * 定义积分获取、消耗规则，每日/每周上限，积分价值换算等
 */
import { SceneCode } from '@bridgeai/shared';
export type RuleType = 'earn' | 'spend';
export interface PointsRule {
    id: string;
    type: RuleType;
    code: string;
    name: string;
    description: string;
    points: number;
    dailyLimit?: number;
    weeklyLimit?: number;
    cooldownMinutes?: number;
    enabled: boolean;
    scene?: SceneCode;
}
export interface PointsLimitConfig {
    dailyEarnLimit: number;
    weeklyEarnLimit: number;
    dailySpendLimit: number;
    weeklySpendLimit: number;
}
export interface PointsValueConfig {
    rmbToPointsRate: number;
    pointsToRmbRate: number;
    minRechargeAmount: number;
    minWithdrawAmount: number;
}
export interface TransferConfig {
    enabled: boolean;
    minAmount: number;
    maxAmount: number;
    feeRate: number;
    feeMin: number;
    feeMax: number;
    dailyLimit: number;
}
export interface FreezeConfig {
    defaultExpireHours: number;
    maxFreezeAmount: number;
}
export declare const DEFAULT_LIMITS: PointsLimitConfig;
export declare const DEFAULT_VALUE_CONFIG: PointsValueConfig;
export declare const DEFAULT_TRANSFER_CONFIG: TransferConfig;
export declare const DEFAULT_FREEZE_CONFIG: FreezeConfig;
export declare const EARN_RULES: Record<string, PointsRule>;
export declare const SPEND_RULES: Record<string, PointsRule>;
export declare const ALL_POINTS_RULES: Record<string, PointsRule>;
/**
 * 获取积分限制配置
 */
export declare function getPointsLimitConfig(): PointsLimitConfig;
/**
 * 更新积分限制配置
 */
export declare function updatePointsLimitConfig(config: Partial<PointsLimitConfig>): void;
/**
 * 获取积分价值配置
 */
export declare function getPointsValueConfig(): PointsValueConfig;
/**
 * 更新积分价值配置
 */
export declare function updatePointsValueConfig(config: Partial<PointsValueConfig>): void;
/**
 * 获取转账配置
 */
export declare function getTransferConfig(): TransferConfig;
/**
 * 更新转账配置
 */
export declare function updateTransferConfig(config: Partial<TransferConfig>): void;
/**
 * 获取冻结配置
 */
export declare function getFreezeConfig(): FreezeConfig;
/**
 * 更新冻结配置
 */
export declare function updateFreezeConfig(config: Partial<FreezeConfig>): void;
/**
 * 根据规则代码获取规则
 */
export declare function getRuleByCode(code: string): PointsRule | undefined;
/**
 * 获取所有获取规则
 */
export declare function getEarnRules(): PointsRule[];
/**
 * 获取所有消耗规则
 */
export declare function getSpendRules(): PointsRule[];
/**
 * 获取场景相关的消耗规则
 */
export declare function getSpendRulesByScene(scene: SceneCode): PointsRule[];
/**
 * 计算充值获得的积分
 */
export declare function calculateRechargePoints(rmbAmount: number): number;
/**
 * 计算积分对应的人民币价值
 */
export declare function calculatePointsRmbValue(points: number): number;
/**
 * 计算转账手续费
 */
export declare function calculateTransferFee(amount: number): number;
/**
 * 重置配置为默认值（用于测试）
 */
export declare function resetPointsConfig(): void;
//# sourceMappingURL=pointsRules.d.ts.map