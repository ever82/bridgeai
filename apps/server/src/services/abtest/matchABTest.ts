/**
 * Match A/B Testing Service
 * 匹配算法 A/B 测试框架
 */

import { MatchScoringModel, MatchConfig, MatchResult } from '../matchAlgorithm';

export interface ABTestVariant {
  id: string;
  name: string;
  version: string;
  config: Partial<MatchConfig>;
  trafficPercent: number; // 流量百分比 (0-100)
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
  timeToMatch: number; // 平均匹配时间（小时）
}

export class MatchABTestService {
  private experiments: Map<string, ABTestExperiment> = new Map();
  private events: MatchEvent[] = [];
  private models: Map<string, MatchScoringModel> = new Map();

  /**
   * 创建 A/B 测试实验
   */
  createExperiment(experiment: Omit<ABTestExperiment, 'id' | 'startTime'>): ABTestExperiment {
    const id = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newExperiment: ABTestExperiment = {
      ...experiment,
      id,
      startTime: new Date(),
      status: 'running',
    };

    // 验证流量分配
    const totalTraffic = newExperiment.variants.reduce((sum, v) => sum + v.trafficPercent, 0);
    if (Math.abs(totalTraffic - 100) > 0.01) {
      throw new Error(`Variant traffic must sum to 100%, current: ${totalTraffic}%`);
    }

    this.experiments.set(id, newExperiment);

    // 预创建模型
    newExperiment.variants.forEach((variant) => {
      const model = new MatchScoringModel(variant.config, variant.version);
      this.models.set(`${id}:${variant.id}`, model);
    });

    console.log(`[ABTest] Created experiment: ${id} - ${newExperiment.name}`);
    return newExperiment;
  }

  /**
   * 获取实验对应的匹配模型
   */
  getModelForExperiment(experimentId: string, userId: string): MatchScoringModel | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'running') {
      return null;
    }

    // 根据 userId 哈希分配到不同 variant
    const variant = this.selectVariant(experiment, userId);
    if (!variant) {
      return null;
    }

    return this.models.get(`${experimentId}:${variant.id}`) || null;
  }

  /**
   * 选择 variant（基于用户哈希）
   */
  private selectVariant(experiment: ABTestExperiment, userId: string): ABTestVariant | null {
    // 使用简单哈希算法
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转为32位整数
    }
    const normalizedHash = Math.abs(hash) % 100;

    // 根据流量分配选择
    let cumulativeTraffic = 0;
    for (const variant of experiment.variants) {
      cumulativeTraffic += variant.trafficPercent;
      if (normalizedHash < cumulativeTraffic) {
        return variant;
      }
    }

    return experiment.variants[0] || null;
  }

  /**
   * 记录匹配事件
   */
  trackEvent(event: Omit<MatchEvent, 'timestamp'>): void {
    const fullEvent: MatchEvent = {
      ...event,
      timestamp: new Date(),
    };

    this.events.push(fullEvent);
    console.log(`[ABTest] Event tracked: ${event.eventType} for ${event.matchId}`);
  }

  /**
   * 计算 A/B 测试指标
   */
  calculateMetrics(experimentId: string): ABTestMetrics[] {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      return [];
    }

    const metrics: ABTestMetrics[] = [];

    for (const variant of experiment.variants) {
      const variantEvents = this.events.filter(
        (e) => e.experimentId === experimentId && e.variantId === variant.id
      );

      const calculatedEvents = variantEvents.filter((e) => e.eventType === 'calculated');
      const contactedEvents = variantEvents.filter((e) => e.eventType === 'contacted');
      const matchedEvents = variantEvents.filter((e) => e.eventType === 'matched');

      const scores = calculatedEvents.map((e) => e.score);
      const avgScore = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;

      const contactRate = calculatedEvents.length > 0
        ? contactedEvents.length / calculatedEvents.length
        : 0;

      const successRate = contactedEvents.length > 0
        ? matchedEvents.length / contactedEvents.length
        : 0;

      // 计算平均匹配时间
      const timeToMatch = this.calculateAverageTimeToMatch(matchedEvents);

      metrics.push({
        experimentId,
        variantId: variant.id,
        totalMatches: calculatedEvents.length,
        avgScore,
        conversionRate: contactRate,
        contactRate,
        successRate,
        timeToMatch,
      });
    }

    return metrics;
  }

  /**
   * 计算平均匹配时间
   */
  private calculateAverageTimeToMatch(matchedEvents: MatchEvent[]): number {
    if (matchedEvents.length === 0) return 0;

    let totalHours = 0;
    let count = 0;

    for (const event of matchedEvents) {
      // 查找对应的计算事件
      const calculatedEvent = this.events.find(
        (e) => e.matchId === event.matchId && e.eventType === 'calculated'
      );

      if (calculatedEvent) {
        const hours = (event.timestamp.getTime() - calculatedEvent.timestamp.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
        count++;
      }
    }

    return count > 0 ? totalHours / count : 0;
  }

  /**
   * 获取实验列表
   */
  getExperiments(status?: 'running' | 'paused' | 'completed'): ABTestExperiment[] {
    const experiments = Array.from(this.experiments.values());
    if (status) {
      return experiments.filter((e) => e.status === status);
    }
    return experiments;
  }

  /**
   * 暂停实验
   */
  pauseExperiment(experimentId: string): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return false;

    experiment.status = 'paused';
    console.log(`[ABTest] Paused experiment: ${experimentId}`);
    return true;
  }

  /**
   * 恢复实验
   */
  resumeExperiment(experimentId: string): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return false;

    experiment.status = 'running';
    console.log(`[ABTest] Resumed experiment: ${experimentId}`);
    return true;
  }

  /**
   * 结束实验
   */
  completeExperiment(experimentId: string): ABTestMetrics[] | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    experiment.status = 'completed';
    experiment.endTime = new Date();

    console.log(`[ABTest] Completed experiment: ${experimentId}`);

    // 返回最终指标
    return this.calculateMetrics(experimentId);
  }

  /**
   * 获取优胜 variant
   */
  getWinningVariant(experimentId: string, metric: 'successRate' | 'contactRate' = 'successRate'): ABTestVariant | null {
    const metrics = this.calculateMetrics(experimentId);
    if (metrics.length === 0) return null;

    const sorted = [...metrics].sort((a, b) => b[metric] - a[metric]);
    const winner = sorted[0];

    if (!winner) return null;

    const experiment = this.experiments.get(experimentId);
    return experiment?.variants.find((v) => v.id === winner.variantId) || null;
  }

  /**
   * 导出实验数据
   */
  exportExperimentData(experimentId: string): { experiment: ABTestExperiment | null; events: MatchEvent[]; metrics: ABTestMetrics[] } {
    const experiment = this.experiments.get(experimentId) || null;
    const events = this.events.filter((e) => e.experimentId === experimentId);
    const metrics = experiment ? this.calculateMetrics(experimentId) : [];

    return { experiment, events, metrics };
  }
}

// 单例实例
export const matchABTestService = new MatchABTestService();
export default matchABTestService;
