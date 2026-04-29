/**
 * 积分服务
 * 提供积分操作的高层API，整合规则引擎和交易服务
 */
import { SceneCode, } from '@bridgeai/shared';
import { prisma } from '../db/client';
import { getRuleByCode, getPointsValueConfig, getPointsLimitConfig, calculateRechargePoints, calculatePointsRmbValue, } from '../config/pointsRules';
import { pointsRuleEngine } from './pointsRuleEngine';
import { pointsTransactionService, } from './pointsTransactionService';
export class PointsService {
    prisma;
    ruleEngine;
    transactionService;
    constructor(prismaClient = prisma, ruleEngine = pointsRuleEngine, transactionService = pointsTransactionService) {
        this.prisma = prismaClient;
        this.ruleEngine = ruleEngine;
        this.transactionService = transactionService;
    }
    // ==================== 账户管理 ====================
    /**
     * 获取用户积分账户
     */
    async getAccount(userId) {
        const account = await this.prisma.pointsAccount.findUnique({
            where: { userId },
        });
        if (!account) {
            return null;
        }
        return {
            id: account.id,
            balance: account.balance,
            totalEarned: account.totalEarned,
            totalSpent: account.totalSpent,
            frozenAmount: account.frozenAmount,
            availableBalance: account.balance - account.frozenAmount,
        };
    }
    /**
     * 获取或创建积分账户
     */
    async getOrCreateAccount(userId) {
        let account = await this.getAccount(userId);
        if (!account) {
            const newAccount = await this.prisma.pointsAccount.create({
                data: {
                    userId,
                    balance: 0,
                    totalEarned: 0,
                    totalSpent: 0,
                    frozenAmount: 0,
                    version: 0,
                },
            });
            account = {
                id: newAccount.id,
                balance: newAccount.balance,
                totalEarned: newAccount.totalEarned,
                totalSpent: newAccount.totalSpent,
                frozenAmount: newAccount.frozenAmount,
                availableBalance: newAccount.balance,
            };
        }
        return account;
    }
    /**
     * 获取用户可用余额
     */
    async getAvailableBalance(userId) {
        const account = await this.prisma.pointsAccount.findUnique({
            where: { userId },
            select: {
                balance: true,
                frozenAmount: true,
            },
        });
        if (!account) {
            return 0;
        }
        return account.balance - account.frozenAmount;
    }
    // ==================== 积分获取 ====================
    /**
     * 执行积分获取规则
     */
    async earnByRule(options) {
        const { userId, ruleCode, metadata } = options;
        // 验证规则
        const validation = this.ruleEngine.validateRule(ruleCode);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error,
            };
        }
        // 检查限制
        const limitCheck = await this.ruleEngine.checkLimits({ userId, ruleCode });
        if (!limitCheck.allowed) {
            return {
                success: false,
                error: limitCheck.error,
            };
        }
        // 计算积分
        const points = await this.ruleEngine.calculatePoints({
            userId,
            ruleCode,
            baseAmount: options.baseAmount,
            metadata,
        });
        // 检查全局限制
        await this.ruleEngine.checkGlobalEarnLimits(userId, points);
        // 获取规则信息
        const rule = getRuleByCode(ruleCode);
        // 执行获取
        const result = await this.transactionService.earnPoints(userId, points, {
            description: `${rule?.name || ruleCode} (${ruleCode})`,
            scene: metadata?.scene,
            referenceId: metadata?.referenceId,
            metadata: {
                ruleCode,
                ...metadata,
            },
        });
        return {
            success: result.success,
            transaction: result.transaction,
            error: result.error,
        };
    }
    /**
     * 充值积分
     */
    async recharge(userId, options) {
        const { rmbAmount, description, metadata } = options;
        if (rmbAmount <= 0) {
            return {
                success: false,
                error: 'Recharge amount must be positive',
            };
        }
        const config = getPointsValueConfig();
        if (rmbAmount < config.minRechargeAmount) {
            return {
                success: false,
                error: `Minimum recharge amount is ${config.minRechargeAmount} RMB`,
            };
        }
        // Ensure account exists
        await this.getOrCreateAccount(userId);
        const points = calculateRechargePoints(rmbAmount);
        const result = await this.transactionService.earnPoints(userId, points, {
            description: description || `Recharge ${rmbAmount} RMB`,
            metadata: {
                rmbAmount,
                ...metadata,
            },
        });
        return {
            success: result.success,
            transaction: result.transaction,
            error: result.error,
        };
    }
    /**
     * 签到获得积分
     */
    async checkIn(userId, continuousDays = 0) {
        // 基础签到
        const baseResult = await this.earnByRule({
            userId,
            ruleCode: 'CHECKIN',
        });
        // 连续签到额外奖励
        if (continuousDays > 1) {
            await this.earnByRule({
                userId,
                ruleCode: 'CHECKIN_CONTINUOUS',
                metadata: { continuousDays },
            });
        }
        return baseResult;
    }
    /**
     * 完成任务获得积分
     */
    async completeTask(userId, taskType = 'normal') {
        const ruleCode = taskType === 'daily' ? 'TASK_DAILY' : 'TASK_COMPLETE';
        return this.earnByRule({
            userId,
            ruleCode,
        });
    }
    /**
     * 邀请好友获得积分
     */
    async inviteFriend(userId, invitedUserId) {
        return this.earnByRule({
            userId,
            ruleCode: 'INVITE_FRIEND',
            metadata: { invitedUserId },
        });
    }
    /**
     * 分享应用获得积分
     */
    async shareApp(userId, platform) {
        return this.earnByRule({
            userId,
            ruleCode: 'SHARE_APP',
            metadata: { platform },
        });
    }
    // ==================== 积分消耗 ====================
    /**
     * 执行积分消耗规则
     */
    async spendByRule(options) {
        const { userId, ruleCode, metadata } = options;
        // 验证规则
        const validation = this.ruleEngine.validateRule(ruleCode);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error,
            };
        }
        // 检查限制
        const limitCheck = await this.ruleEngine.checkLimits({ userId, ruleCode });
        if (!limitCheck.allowed) {
            return {
                success: false,
                error: limitCheck.error,
            };
        }
        // 计算积分（消耗为负值）
        const points = await this.ruleEngine.calculatePoints({
            userId,
            ruleCode,
            baseAmount: options.baseAmount,
            metadata,
        });
        const spendAmount = Math.abs(points);
        // 检查全局限制
        await this.ruleEngine.checkGlobalSpendLimits(userId, spendAmount);
        // 检查余额
        const availableBalance = await this.getAvailableBalance(userId);
        if (availableBalance < spendAmount) {
            return {
                success: false,
                error: `Insufficient points. Available: ${availableBalance}, Required: ${spendAmount}`,
            };
        }
        // 获取规则信息
        const rule = getRuleByCode(ruleCode);
        // 执行消耗
        const result = await this.transactionService.spendPoints(userId, spendAmount, {
            description: `${rule?.name || ruleCode} (${ruleCode})`,
            scene: rule?.scene || metadata?.scene,
            referenceId: metadata?.referenceId,
            metadata: {
                ruleCode,
                ...metadata,
            },
        });
        return {
            success: result.success,
            transaction: result.transaction,
            error: result.error,
        };
    }
    /**
     * 查看照片
     */
    async viewPhoto(userId, photoId, ownerId) {
        return this.spendByRule({
            userId,
            ruleCode: 'VIEW_PHOTO',
            metadata: {
                photoId,
                ownerId,
                scene: SceneCode.VISION_SHARE,
            },
        });
    }
    /**
     * 查看详细资料
     */
    async viewProfile(userId, targetUserId) {
        return this.spendByRule({
            userId,
            ruleCode: 'VIEW_PROFILE',
            metadata: { targetUserId },
        });
    }
    /**
     * 发起匹配
     */
    async initiateMatch(userId, targetUserId) {
        return this.spendByRule({
            userId,
            ruleCode: 'INITIATE_MATCH',
            metadata: {
                targetUserId,
                scene: SceneCode.AGENT_DATE,
            },
        });
    }
    /**
     * 超级喜欢
     */
    async superLike(userId, targetUserId) {
        return this.spendByRule({
            userId,
            ruleCode: 'SUPER_LIKE',
            metadata: { targetUserId },
        });
    }
    /**
     * 打赏用户
     */
    async tipUser(userId, toUserId, amount, message) {
        // 打赏实际是转账
        return this.transfer(userId, toUserId, amount, {
            description: message || `Tip to user`,
            metadata: { type: 'tip', message },
        });
    }
    /**
     * 购买服务
     */
    async buyService(userId, serviceId, pointsCost, serviceName) {
        return this.spendByRule({
            userId,
            ruleCode: 'BUY_SERVICE',
            baseAmount: pointsCost,
            metadata: {
                serviceId,
                serviceName,
            },
        });
    }
    /**
     * 资料推广
     */
    async boostProfile(userId, durationHours = 24) {
        return this.spendByRule({
            userId,
            ruleCode: 'BOOST_PROFILE',
            metadata: { durationHours },
        });
    }
    // ==================== 积分冻结/解冻 ====================
    /**
     * 冻结积分
     */
    async freezePoints(userId, amount, options) {
        const result = await this.transactionService.freezePoints(userId, amount, {
            reason: options.reason,
            scene: options.scene,
            referenceId: options.referenceId,
            expiresAt: options.expiresAt ? new Date(options.expiresAt) : undefined,
        });
        return {
            success: result.success,
            transaction: result.transaction,
            freeze: result.freeze,
            error: result.error,
        };
    }
    /**
     * 解冻积分
     */
    async unfreezePoints(userId, freezeId) {
        const result = await this.transactionService.unfreezePoints(userId, freezeId);
        return {
            success: result.success,
            transaction: result.transaction,
            freeze: result.freeze,
            error: result.error,
        };
    }
    /**
     * 确认使用冻结积分
     */
    async confirmFreeze(userId, freezeId) {
        const result = await this.transactionService.confirmFrozenPoints(userId, freezeId);
        return {
            success: result.success,
            transaction: result.transaction,
            freeze: result.freeze,
            error: result.error,
        };
    }
    /**
     * 获取冻结记录列表
     */
    async getFreezeList(userId, options = {}) {
        const { page = 1, pageSize = 20 } = options;
        const skip = (page - 1) * pageSize;
        const account = await this.prisma.pointsAccount.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (!account) {
            return {
                freezes: [],
                pagination: {
                    page,
                    pageSize,
                    total: 0,
                    totalPages: 0,
                },
            };
        }
        const [freezes, total] = await Promise.all([
            this.prisma.pointsFreeze.findMany({
                where: { accountId: account.id },
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
            }),
            this.prisma.pointsFreeze.count({
                where: { accountId: account.id },
            }),
        ]);
        return {
            freezes: freezes,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        };
    }
    // ==================== 积分转账 ====================
    /**
     * 转账积分
     */
    async transfer(fromUserId, toUserId, amount, options = {}) {
        const result = await this.transactionService.transferPoints(fromUserId, toUserId, amount, options);
        return {
            success: result.success,
            transaction: result.transaction,
            error: result.error,
        };
    }
    // ==================== 交易记录查询 ====================
    /**
     * 获取交易记录列表
     */
    async getTransactionList(userId, filter = {}, options = {}) {
        const { page = 1, pageSize = 20 } = options;
        const skip = (page - 1) * pageSize;
        const where = { userId };
        if (filter.type) {
            where.type = filter.type;
        }
        if (filter.scene) {
            where.scene = filter.scene;
        }
        if (filter.startDate || filter.endDate) {
            where.createdAt = {};
            if (filter.startDate) {
                where.createdAt.gte = filter.startDate;
            }
            if (filter.endDate) {
                where.createdAt.lte = filter.endDate;
            }
        }
        const [transactions, total] = await Promise.all([
            this.prisma.pointsTransaction.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
            }),
            this.prisma.pointsTransaction.count({ where }),
        ]);
        return {
            transactions: transactions,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        };
    }
    /**
     * 获取交易详情
     */
    async getTransactionDetail(userId, transactionId) {
        const transaction = await this.prisma.pointsTransaction.findFirst({
            where: {
                id: transactionId,
                userId,
            },
        });
        return transaction;
    }
    /**
     * 获取交易统计（按类型分类）
     */
    async getTransactionStats(userId) {
        const account = await this.prisma.pointsAccount.findUnique({
            where: { userId },
        });
        if (!account) {
            return {
                balance: 0,
                totalEarned: 0,
                totalSpent: 0,
                frozenAmount: 0,
                availableBalance: 0,
                byType: [],
                recentStats: {
                    dailyEarned: 0,
                    weeklyEarned: 0,
                    dailySpent: 0,
                    weeklySpent: 0,
                },
            };
        }
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfDay);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        // 按类型统计
        const statsByType = await this.prisma.pointsTransaction.groupBy({
            by: ['type'],
            where: { userId },
            _count: { id: true },
            _sum: { amount: true },
        });
        const byType = statsByType.map(s => ({
            type: s.type,
            count: s._count.id,
            totalAmount: s._sum.amount ?? 0,
        }));
        // 按类型分别获取今日/本周数据
        const earnTypes = ['EARN'];
        const spendTypes = ['SPEND'];
        const [dailyEarned, weeklyEarned, dailySpent, weeklySpent] = await Promise.all([
            this.prisma.pointsTransaction.aggregate({
                where: {
                    userId,
                    type: { in: earnTypes },
                    createdAt: { gte: startOfDay },
                },
                _sum: { amount: true },
            }),
            this.prisma.pointsTransaction.aggregate({
                where: {
                    userId,
                    type: { in: earnTypes },
                    createdAt: { gte: startOfWeek },
                },
                _sum: { amount: true },
            }),
            this.prisma.pointsTransaction.aggregate({
                where: {
                    userId,
                    type: { in: spendTypes },
                    createdAt: { gte: startOfDay },
                },
                _sum: { amount: true },
            }),
            this.prisma.pointsTransaction.aggregate({
                where: {
                    userId,
                    type: { in: spendTypes },
                    createdAt: { gte: startOfWeek },
                },
                _sum: { amount: true },
            }),
        ]);
        return {
            balance: account.balance,
            totalEarned: account.totalEarned,
            totalSpent: account.totalSpent,
            frozenAmount: account.frozenAmount,
            availableBalance: account.balance - account.frozenAmount,
            byType,
            recentStats: {
                dailyEarned: dailyEarned._sum.amount ?? 0,
                weeklyEarned: weeklyEarned._sum.amount ?? 0,
                dailySpent: Math.abs(dailySpent._sum.amount ?? 0),
                weeklySpent: Math.abs(weeklySpent._sum.amount ?? 0),
            },
        };
    }
    /**
     * 导出交易记录为CSV格式
     */
    async exportTransactions(userId, filter = {}) {
        const where = { userId };
        if (filter.type) {
            where.type = filter.type;
        }
        if (filter.scene) {
            where.scene = filter.scene;
        }
        if (filter.startDate || filter.endDate) {
            where.createdAt = {};
            if (filter.startDate) {
                where.createdAt.gte = filter.startDate;
            }
            if (filter.endDate) {
                where.createdAt.lte = filter.endDate;
            }
        }
        const transactions = await this.prisma.pointsTransaction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 10000, // 限制导出数量
        });
        // CSV 头部
        const headers = ['ID', 'Type', 'Amount', 'Balance After', 'Description', 'Scene', 'Created At'];
        const rows = transactions.map(t => [
            t.id,
            t.type,
            t.amount.toString(),
            t.balanceAfter.toString(),
            t.description ?? '',
            t.scene ?? '',
            t.createdAt.toISOString(),
        ]);
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
        ].join('\n');
        return csvContent;
    }
    // ==================== 规则查询 ====================
    /**
     * 获取所有可用规则
     */
    getAllRules() {
        return this.ruleEngine.getAllRules();
    }
    /**
     * 获取场景规则
     */
    getRulesByScene(scene) {
        return this.ruleEngine.getRulesByScene(scene);
    }
    /**
     * 获取规则详情
     */
    getRuleDetail(ruleCode) {
        return this.ruleEngine.getRuleDetail(ruleCode);
    }
    /**
     * 检查规则限制
     */
    async checkRuleLimits(userId, ruleCode) {
        return this.ruleEngine.checkLimits({ userId, ruleCode });
    }
    // ==================== 配置查询 ====================
    /**
     * 获取积分价值配置
     */
    getValueConfig() {
        return getPointsValueConfig();
    }
    /**
     * 获取积分限制配置
     */
    getLimitConfig() {
        return getPointsLimitConfig();
    }
    /**
     * 计算充值积分
     */
    calculateRechargePoints(rmbAmount) {
        return calculateRechargePoints(rmbAmount);
    }
    /**
     * 计算积分人民币价值
     */
    calculatePointsRmbValue(points) {
        return calculatePointsRmbValue(points);
    }
    // ==================== 管理功能 ====================
    /**
     * 扣除积分（用于违规惩罚等管理操作）
     */
    async deductPoints(userId, amount, reason, adminId) {
        if (amount <= 0) {
            return {
                success: false,
                error: 'Deduct amount must be positive',
            };
        }
        // 检查余额
        const availableBalance = await this.getAvailableBalance(userId);
        if (availableBalance < amount) {
            return {
                success: false,
                error: `Insufficient points. Available: ${availableBalance}, Required: ${amount}`,
            };
        }
        const result = await this.transactionService.spendPoints(userId, amount, {
            description: `Deduct: ${reason}`,
            metadata: {
                type: 'deduct',
                reason,
                adminId,
            },
        });
        return {
            success: result.success,
            transaction: result.transaction,
            error: result.error,
        };
    }
    /**
     * 手动增加积分（用于补偿等管理操作）
     */
    async manualAddPoints(userId, amount, reason, adminId) {
        if (amount <= 0) {
            return {
                success: false,
                error: 'Amount must be positive',
            };
        }
        const result = await this.transactionService.earnPoints(userId, amount, {
            description: `Manual add: ${reason}`,
            metadata: {
                type: 'manual',
                reason,
                adminId,
            },
        });
        return {
            success: result.success,
            transaction: result.transaction,
            error: result.error,
        };
    }
    /**
     * 批量发放积分奖励
     */
    async batchReward(userIds, amount, reason) {
        const operations = userIds.map(userId => ({
            userId,
            amount,
            options: {
                description: `Batch reward: ${reason}`,
                metadata: { type: 'batch', reason },
            },
        }));
        const result = await this.transactionService.batchEarnPoints(operations);
        return {
            success: result.transactions.length,
            failed: userIds.length - result.transactions.length,
        };
    }
    /**
     * 清理过期冻结
     */
    async cleanupExpiredFreezes() {
        return this.transactionService.cleanupExpiredFreezes();
    }
}
// 导出单例实例
export const pointsService = new PointsService();
//# sourceMappingURL=pointsService.js.map