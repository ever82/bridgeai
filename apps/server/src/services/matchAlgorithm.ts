/**
 * Match Scoring Model
 * 多维度匹配评分模型，支持权重配置和场景特定算法
 */

export interface MatchDimension {
  name: string;
  weight: number;
  score: number;
  description?: string;
}

export interface MatchWeights {
  l1: number;      // 基础属性权重
  l2: number;      // 结构化信息权重
  l3: number;      // 语义匹配权重
  dimensions: Record<string, number>;
}

export interface MatchConfig {
  scene: string;
  weights: MatchWeights;
  thresholds: {
    min: number;
    good: number;
    excellent: number;
  };
  aiEnabled: boolean;
}

export interface MatchResult {
  score: number;
  level: 'poor' | 'fair' | 'good' | 'excellent';
  l1Score: number;
  l2Score: number;
  l3Score: number;
  dimensions: MatchDimension[];
  explanation: string;
  timestamp: Date;
  algorithmVersion: string;
}

export const DEFAULT_WEIGHTS: MatchWeights = {
  l1: 0.3,
  l2: 0.3,
  l3: 0.4,
  dimensions: {
    category: 0.25,
    location: 0.25,
    time: 0.2,
    price: 0.15,
    tags: 0.15,
  },
};

export const SCENE_CONFIGS: Record<string, Partial<MatchConfig>> = {
  supply_demand: {
    weights: {
      l1: 0.35,
      l2: 0.35,
      l3: 0.3,
      dimensions: {
        category: 0.3,
        location: 0.25,
        time: 0.2,
        price: 0.15,
        tags: 0.1,
      },
    },
  },
  skill_matching: {
    weights: {
      l1: 0.25,
      l2: 0.25,
      l3: 0.5,
      dimensions: {
        category: 0.2,
        location: 0.15,
        time: 0.15,
        price: 0.1,
        tags: 0.4,
      },
    },
  },
  resource_sharing: {
    weights: {
      l1: 0.4,
      l2: 0.3,
      l3: 0.3,
      dimensions: {
        category: 0.35,
        location: 0.3,
        time: 0.15,
        price: 0.15,
        tags: 0.05,
      },
    },
  },
};

export class MatchScoringModel {
  private config: MatchConfig;
  private version: string;

  constructor(config?: Partial<MatchConfig>, version: string = 'v1.0.0') {
    this.config = this.mergeConfig(config);
    this.version = version;
  }

  private mergeConfig(config?: Partial<MatchConfig>): MatchConfig {
    const scene = config?.scene || 'default';
    const sceneConfig = SCENE_CONFIGS[scene] || {};

    return {
      scene: scene,
      weights: {
        ...DEFAULT_WEIGHTS,
        ...sceneConfig.weights,
        ...config?.weights,
        dimensions: {
          ...DEFAULT_WEIGHTS.dimensions,
          ...sceneConfig.weights?.dimensions,
          ...config?.weights?.dimensions,
        },
      },
      thresholds: {
        min: 0.3,
        good: 0.6,
        excellent: 0.8,
        ...sceneConfig.thresholds,
        ...config?.thresholds,
      },
      aiEnabled: config?.aiEnabled ?? true,
    };
  }

  /**
   * 计算综合匹配分数
   */
  calculateScore(
    l1Score: number,
    l2Score: number,
    l3Score: number,
    dimensions: MatchDimension[]
  ): MatchResult {
    const weights = this.config.weights;

    // 计算加权总分
    const weightedScore =
      l1Score * weights.l1 +
      l2Score * weights.l2 +
      l3Score * weights.l3;

    // 归一化到 0-1
    const normalizedScore = Math.min(Math.max(weightedScore, 0), 1);

    // 确定匹配等级
    const level = this.getMatchLevel(normalizedScore);

    // 生成解释
    const explanation = this.generateExplanation(dimensions, normalizedScore);

    return {
      score: Math.round(normalizedScore * 100) / 100,
      level,
      l1Score: Math.round(l1Score * 100) / 100,
      l2Score: Math.round(l2Score * 100) / 100,
      l3Score: Math.round(l3Score * 100) / 100,
      dimensions,
      explanation,
      timestamp: new Date(),
      algorithmVersion: this.version,
    };
  }

  /**
   * 获取匹配等级
   */
  private getMatchLevel(score: number): 'poor' | 'fair' | 'good' | 'excellent' {
    const { thresholds } = this.config;
    if (score >= thresholds.excellent) return 'excellent';
    if (score >= thresholds.good) return 'good';
    if (score >= thresholds.min) return 'fair';
    return 'poor';
  }

  /**
   * 生成匹配解释
   */
  private generateExplanation(dimensions: MatchDimension[], score: number): string {
    const topDimensions = dimensions
      .filter((d) => d.score > 0.7)
      .map((d) => d.name)
      .slice(0, 3);

    const weakDimensions = dimensions
      .filter((d) => d.score < 0.4)
      .map((d) => d.name);

    let explanation = `匹配度 ${Math.round(score * 100)}%`;

    if (topDimensions.length > 0) {
      explanation += `。优势维度: ${topDimensions.join('、')}`;
    }

    if (weakDimensions.length > 0) {
      explanation += `。待优化: ${weakDimensions.join('、')}`;
    }

    return explanation;
  }

  /**
   * 更新权重配置
   */
  updateWeights(weights: Partial<MatchWeights>): void {
    this.config.weights = {
      ...this.config.weights,
      ...weights,
      dimensions: {
        ...this.config.weights.dimensions,
        ...weights.dimensions,
      },
    };
  }

  /**
   * 获取当前配置
   */
  getConfig(): MatchConfig {
    return { ...this.config };
  }

  /**
   * 批量计算匹配度
   */
  batchCalculate(
    items: Array<{
      id: string;
      l1Score: number;
      l2Score: number;
      l3Score: number;
      dimensions: MatchDimension[];
    }>
  ): MatchResult[] {
    return items.map((item) =>
      this.calculateScore(item.l1Score, item.l2Score, item.l3Score, item.dimensions)
    );
  }

  /**
   * 机器学习优化权重
   * 根据历史匹配数据调整权重
   */
  optimizeWeights(feedback: Array<{ matchId: string; success: boolean; score: number }>): void {
    // 分析成功匹配的维度特征
    const successMatches = feedback.filter((f) => f.success);
    const avgSuccessScore =
      successMatches.reduce((sum, f) => sum + f.score, 0) / successMatches.length || 0;

    // 根据成功率微调权重
    if (avgSuccessScore > 0.7) {
      // 如果高匹配度成功率高，增加 L3 权重
      this.config.weights.l3 = Math.min(this.config.weights.l3 * 1.05, 0.6);
    } else if (avgSuccessScore < 0.5) {
      // 如果匹配度普遍偏低，增加 L1/L2 权重
      this.config.weights.l1 = Math.min(this.config.weights.l1 * 1.05, 0.5);
      this.config.weights.l2 = Math.min(this.config.weights.l2 * 1.05, 0.5);
    }

    // 重新归一化
    const total = this.config.weights.l1 + this.config.weights.l2 + this.config.weights.l3;
    this.config.weights.l1 /= total;
    this.config.weights.l2 /= total;
    this.config.weights.l3 /= total;
  }
}

export default MatchScoringModel;
