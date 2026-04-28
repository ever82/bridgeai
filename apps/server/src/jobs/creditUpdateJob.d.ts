/**
 * 信用分定时更新任务
 * 全量计算和更新用户信用分
 */
interface CreditUpdateJobConfig {
    batchSize: number;
    delayBetweenBatches: number;
    maxUsersPerRun: number;
}
/**
 * 全量信用分更新任务
 * 建议运行频率：每日凌晨
 */
export declare function runCreditUpdateJob(config?: Partial<CreditUpdateJobConfig>): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    errors: string[];
}>;
/**
 * 检测异常波动
 * 找出信用分异常变化的用户
 */
export declare function detectCreditFluctuations(threshold?: number): Promise<Array<{
    userId: string;
    oldScore: number;
    newScore: number;
    delta: number;
}>>;
/**
 * 清理过期历史记录
 * 保留最近一年的记录
 */
export declare function cleanupOldCreditHistory(): Promise<{
    deleted: number;
}>;
/**
 * 生成信用分统计报告
 */
export declare function generateCreditReport(): Promise<{
    totalUsers: number;
    averageScore: number;
    levelDistribution: Record<string, number>;
}>;
export {};
//# sourceMappingURL=creditUpdateJob.d.ts.map