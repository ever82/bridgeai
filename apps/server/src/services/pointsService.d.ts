/**
 * 积分服务
 * 提供积分操作的高层API，整合规则引擎和交易服务
 */
import { PrismaClient } from '@prisma/client';
import { PointsTransaction, PointsAccountResponse, PointsTransactionListResponse, PointsFreezeListResponse, CreatePointsFreezeRequest, PointsOperationResult, PointsTransactionType, SceneCode, PointsStatsResponse } from '@bridgeai/shared';
import { PointsValueConfig, PointsLimitConfig } from '../config/pointsRules';
import { PointsRuleEngine } from './pointsRuleEngine';
import { PointsTransactionService } from './pointsTransactionService';
export interface RuleExecuteOptions {
    userId: string;
    ruleCode: string;
    baseAmount?: number;
    metadata?: Record<string, unknown>;
}
export interface RechargeOptions {
    rmbAmount: number;
    description?: string;
    metadata?: Record<string, unknown>;
}
export interface PaginationOptions {
    page?: number;
    pageSize?: number;
}
export interface TransactionFilter {
    type?: PointsTransactionType;
    scene?: SceneCode;
    startDate?: Date;
    endDate?: Date;
}
export declare class PointsService {
    private prisma;
    private ruleEngine;
    private transactionService;
    constructor(prismaClient?: PrismaClient, ruleEngine?: PointsRuleEngine, transactionService?: PointsTransactionService);
    /**
     * 获取用户积分账户
     */
    getAccount(userId: string): Promise<PointsAccountResponse | null>;
    /**
     * 获取或创建积分账户
     */
    getOrCreateAccount(userId: string): Promise<PointsAccountResponse>;
    /**
     * 获取用户可用余额
     */
    getAvailableBalance(userId: string): Promise<number>;
    /**
     * 执行积分获取规则
     */
    earnByRule(options: RuleExecuteOptions): Promise<PointsOperationResult>;
    /**
     * 充值积分
     */
    recharge(userId: string, options: RechargeOptions): Promise<PointsOperationResult>;
    /**
     * 签到获得积分
     */
    checkIn(userId: string, continuousDays?: number): Promise<PointsOperationResult>;
    /**
     * 完成任务获得积分
     */
    completeTask(userId: string, taskType?: 'daily' | 'normal'): Promise<PointsOperationResult>;
    /**
     * 邀请好友获得积分
     */
    inviteFriend(userId: string, invitedUserId: string): Promise<PointsOperationResult>;
    /**
     * 分享应用获得积分
     */
    shareApp(userId: string, platform: string): Promise<PointsOperationResult>;
    /**
     * 执行积分消耗规则
     */
    spendByRule(options: RuleExecuteOptions): Promise<PointsOperationResult>;
    /**
     * 查看照片
     */
    viewPhoto(userId: string, photoId: string, ownerId: string): Promise<PointsOperationResult>;
    /**
     * 查看详细资料
     */
    viewProfile(userId: string, targetUserId: string): Promise<PointsOperationResult>;
    /**
     * 发起匹配
     */
    initiateMatch(userId: string, targetUserId: string): Promise<PointsOperationResult>;
    /**
     * 超级喜欢
     */
    superLike(userId: string, targetUserId: string): Promise<PointsOperationResult>;
    /**
     * 打赏用户
     */
    tipUser(userId: string, toUserId: string, amount: number, message?: string): Promise<PointsOperationResult>;
    /**
     * 购买服务
     */
    buyService(userId: string, serviceId: string, pointsCost: number, serviceName: string): Promise<PointsOperationResult>;
    /**
     * 资料推广
     */
    boostProfile(userId: string, durationHours?: number): Promise<PointsOperationResult>;
    /**
     * 冻结积分
     */
    freezePoints(userId: string, amount: number, options: CreatePointsFreezeRequest): Promise<PointsOperationResult>;
    /**
     * 解冻积分
     */
    unfreezePoints(userId: string, freezeId: string): Promise<PointsOperationResult>;
    /**
     * 确认使用冻结积分
     */
    confirmFreeze(userId: string, freezeId: string): Promise<PointsOperationResult>;
    /**
     * 获取冻结记录列表
     */
    getFreezeList(userId: string, options?: PaginationOptions): Promise<PointsFreezeListResponse>;
    /**
     * 转账积分
     */
    transfer(fromUserId: string, toUserId: string, amount: number, options?: {
        description?: string;
        metadata?: Record<string, unknown>;
    }): Promise<PointsOperationResult>;
    /**
     * 获取交易记录列表
     */
    getTransactionList(userId: string, filter?: TransactionFilter, options?: PaginationOptions): Promise<PointsTransactionListResponse>;
    /**
     * 获取交易详情
     */
    getTransactionDetail(userId: string, transactionId: string): Promise<PointsTransaction | null>;
    /**
     * 获取交易统计（按类型分类）
     */
    getTransactionStats(userId: string): Promise<PointsStatsResponse>;
    /**
     * 导出交易记录为CSV格式
     */
    exportTransactions(userId: string, filter?: TransactionFilter): Promise<string>;
    /**
     * 获取所有可用规则
     */
    getAllRules(): import("../config/pointsRules").PointsRule[];
    /**
     * 获取场景规则
     */
    getRulesByScene(scene: SceneCode): import("../config/pointsRules").PointsRule[];
    /**
     * 获取规则详情
     */
    getRuleDetail(ruleCode: string): import("../config/pointsRules").PointsRule;
    /**
     * 检查规则限制
     */
    checkRuleLimits(userId: string, ruleCode: string): Promise<import("./pointsRuleEngine").LimitCheckResult>;
    /**
     * 获取积分价值配置
     */
    getValueConfig(): PointsValueConfig;
    /**
     * 获取积分限制配置
     */
    getLimitConfig(): PointsLimitConfig;
    /**
     * 计算充值积分
     */
    calculateRechargePoints(rmbAmount: number): number;
    /**
     * 计算积分人民币价值
     */
    calculatePointsRmbValue(points: number): number;
    /**
     * 扣除积分（用于违规惩罚等管理操作）
     */
    deductPoints(userId: string, amount: number, reason: string, adminId?: string): Promise<PointsOperationResult>;
    /**
     * 手动增加积分（用于补偿等管理操作）
     */
    manualAddPoints(userId: string, amount: number, reason: string, adminId?: string): Promise<PointsOperationResult>;
    /**
     * 批量发放积分奖励
     */
    batchReward(userIds: string[], amount: number, reason: string): Promise<{
        success: number;
        failed: number;
    }>;
    /**
     * 清理过期冻结
     */
    cleanupExpiredFreezes(): Promise<number>;
}
export declare const pointsService: PointsService;
//# sourceMappingURL=pointsService.d.ts.map