/**
 * Match A/B Testing Service
 * 匹配算法 A/B 测试框架
 */
import { MatchScoringModel, MatchConfig } from '../matchAlgorithm/matchAlgorithm';
export interface ABTestVariant {
    id: string;
    name: string;
    version: string;
    config: Partial<MatchConfig>;
    trafficPercent: number;
}
export interface ABTestExperiment {
    id: string;
    name: string;
    description: string;
    variants: ABTestVariant[];
    startTime: Date;
    endTime?: Date;
    status: 'running' | 'paused' | 'completed';
    targetMetrics: string[];
}
export interface MatchEvent {
    experimentId: string;
    variantId: string;
    matchId: string;
    supplyId: string;
    demandId: string;
    score: number;
    eventType: 'calculated' | 'viewed' | 'contacted' | 'matched';
    timestamp: Date;
    metadata?: Record<string, unknown>;
}
export interface ABTestMetrics {
    experimentId: string;
    variantId: string;
    totalMatches: number;
    avgScore: number;
    conversionRate: number;
    contactRate: number;
    successRate: number;
    timeToMatch: number;
}
export declare class MatchABTestService {
    private experiments;
    private events;
    private models;
    /**
     * 创建 A/B 测试实验
     */
    createExperiment(experiment: Omit<ABTestExperiment, 'id' | 'startTime' | 'status'>): ABTestExperiment;
    /**
     * 获取实验对应的匹配模型
     */
    getModelForExperiment(experimentId: string, userId: string): MatchScoringModel | null;
    /**
     * 选择 variant（基于用户哈希）
     */
    private selectVariant;
    /**
     * 记录匹配事件
     */
    trackEvent(event: Omit<MatchEvent, 'timestamp'>): void;
    /**
     * 计算 A/B 测试指标
     */
    calculateMetrics(experimentId: string): ABTestMetrics[];
    /**
     * 计算平均匹配时间
     */
    private calculateAverageTimeToMatch;
    /**
     * 获取实验列表
     */
    getExperiments(status?: 'running' | 'paused' | 'completed'): ABTestExperiment[];
    /**
     * 暂停实验
     */
    pauseExperiment(experimentId: string): boolean;
    /**
     * 恢复实验
     */
    resumeExperiment(experimentId: string): boolean;
    /**
     * 结束实验
     */
    completeExperiment(experimentId: string): ABTestMetrics[] | null;
    /**
     * 获取优胜 variant
     */
    getWinningVariant(experimentId: string, metric?: 'successRate' | 'contactRate'): ABTestVariant | null;
    /**
     * 导出实验数据
     */
    exportExperimentData(experimentId: string): {
        experiment: ABTestExperiment | null;
        events: MatchEvent[];
        metrics: ABTestMetrics[];
    };
}
export declare const matchABTestService: MatchABTestService;
export default matchABTestService;
//# sourceMappingURL=matchABTest.d.ts.map