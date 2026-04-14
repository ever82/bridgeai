/**
 * L3 Matcher - 语义匹配 (AI)
 * 使用 AI/LLM 进行语义理解和匹配
 */

export interface L3SemanticData {
  title: string;
  description: string;
  expectations: string[];
  constraints: string[];
  keywords: string[];
}

export interface L3MatchResult {
  score: number;
  semanticSimilarity: number;
  intentAlignment: number;
  constraintCompatibility: number;
  reasoning: string;
  matchedKeywords: string[];
}

export interface L3MatchOptions {
  useLLM?: boolean;
  llmModel?: string;
  similarityThreshold?: number;
  keywordMatchWeight?: number;
}

const DEFAULT_OPTIONS: L3MatchOptions = {
  useLLM: false,
  llmModel: 'claude-3-haiku',
  similarityThreshold: 0.6,
  keywordMatchWeight: 0.3,
};

export class L3Matcher {
  private options: L3MatchOptions;

  constructor(options: Partial<L3MatchOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 计算 L3 语义匹配分数
   */
  async calculate(supply: L3SemanticData, demand: L3SemanticData): Promise<L3MatchResult> {
    const results = await Promise.all([
      this.calculateSemanticSimilarity(supply, demand),
      this.calculateIntentAlignment(supply, demand),
      this.calculateConstraintCompatibility(supply, demand),
    ]);

    const [semanticSimilarity, intentAlignment, constraintCompatibility] = results;

    // 加权总分
    const weights = [0.4, 0.35, 0.25];
    const score =
      semanticSimilarity * weights[0] +
      intentAlignment * weights[1] +
      constraintCompatibility * weights[2];

    const matchedKeywords = this.findMatchedKeywords(supply, demand);

    const reasoning = this.generateReasoning(
      supply,
      demand,
      semanticSimilarity,
      intentAlignment,
      constraintCompatibility,
      matchedKeywords
    );

    return {
      score: Math.min(Math.max(score, 0), 1),
      semanticSimilarity,
      intentAlignment,
      constraintCompatibility,
      reasoning,
      matchedKeywords,
    };
  }

  /**
   * 计算语义相似度
   */
  private async calculateSemanticSimilarity(
    supply: L3SemanticData,
    demand: L3SemanticData
  ): Promise<number> {
    // 文本相似度计算（简化实现，实际可调用嵌入模型）
    const titleSimilarity = this.textSimilarity(supply.title, demand.title);
    const descSimilarity = this.textSimilarity(supply.description, demand.description);

    // 关键词相似度
    const keywordSimilarity = this.keywordOverlap(supply.keywords, demand.keywords);

    // 加权
    return titleSimilarity * 0.3 + descSimilarity * 0.5 + keywordSimilarity * 0.2;
  }

  /**
   * 计算意图对齐度
   */
  private async calculateIntentAlignment(
    supply: L3SemanticData,
    demand: L3SemanticData
  ): Promise<number> {
    if (supply.expectations.length === 0 || demand.expectations.length === 0) {
      return 0.5;
    }

    let totalAlignment = 0;
    let comparisonCount = 0;

    for (const demandExp of demand.expectations) {
      let bestMatch = 0;
      for (const supplyExp of supply.expectations) {
        const similarity = this.textSimilarity(demandExp, supplyExp);
        bestMatch = Math.max(bestMatch, similarity);
      }
      totalAlignment += bestMatch;
      comparisonCount++;
    }

    return comparisonCount > 0 ? totalAlignment / comparisonCount : 0.5;
  }

  /**
   * 计算约束兼容性
   */
  private async calculateConstraintCompatibility(
    supply: L3SemanticData,
    demand: L3SemanticData
  ): Promise<number> {
    if (supply.constraints.length === 0 && demand.constraints.length === 0) {
      return 1; // 双方都无约束，完全兼容
    }

    if (supply.constraints.length === 0) {
      return 0.7; // 供给方无约束，需求方有约束
    }

    if (demand.constraints.length === 0) {
      return 0.8; // 需求方无约束，供给方有约束
    }

    // 检查约束冲突
    let conflictCount = 0;
    let compatibleCount = 0;

    for (const demandConstraint of demand.constraints) {
      let hasConflict = false;
      for (const supplyConstraint of supply.constraints) {
        if (this.detectConflict(demandConstraint, supplyConstraint)) {
          hasConflict = true;
          break;
        }
      }

      if (hasConflict) {
        conflictCount++;
      } else {
        compatibleCount++;
      }
    }

    const totalConstraints = demand.constraints.length;
    const compatibilityRatio = compatibleCount / totalConstraints;

    // 冲突惩罚
    const conflictPenalty = conflictCount * 0.2;

    return Math.max(0, compatibilityRatio - conflictPenalty);
  }

  /**
   * 检测约束冲突
   */
  private detectConstraint(constraint1: string, constraint2: string): boolean {
    // 简化的冲突检测逻辑
    const negativeWords = ['不', 'no', 'not', '禁止', '无法', '不能'];
    const c1HasNegative = negativeWords.some((w) => constraint1.includes(w));
    const c2HasNegative = negativeWords.some((w) => constraint2.includes(w));

    // 如果双方都有否定词，可能有冲突
    if (c1HasNegative && c2HasNegative) {
      const c1Core = constraint1.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '');
      const c2Core = constraint2.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '');

      // 如果核心内容相似但都有否定，可能冲突
      const similarity = this.textSimilarity(c1Core, c2Core);
      if (similarity > 0.6) {
        return true;
      }
    }

    return false;
  }

  /**
   * 文本相似度计算（基于字符重叠）
   */
  private textSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    const words1 = this.extractWords(text1);
    const words2 = this.extractWords(text2);

    if (words1.length === 0 || words2.length === 0) return 0;

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * 提取词汇（分词简化版）
   */
  private extractWords(text: string): string[] {
    // 简化处理：按空格和标点分词，转小写
    return text
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1);
  }

  /**
   * 关键词重叠度
   */
  private keywordOverlap(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 || keywords2.length === 0) return 0;

    const set1 = new Set(keywords1.map((k) => k.toLowerCase()));
    const set2 = new Set(keywords2.map((k) => k.toLowerCase()));

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * 找出匹配的关键词
   */
  private findMatchedKeywords(
    supply: L3SemanticData,
    demand: L3SemanticData
  ): string[] {
    const supplyKeywords = new Set(supply.keywords.map((k) => k.toLowerCase()));
    return demand.keywords.filter((k) => supplyKeywords.has(k.toLowerCase()));
  }

  /**
   * 生成匹配理由
   */
  private generateReasoning(
    supply: L3SemanticData,
    demand: L3SemanticData,
    semanticSimilarity: number,
    intentAlignment: number,
    constraintCompatibility: number,
    matchedKeywords: string[]
  ): string {
    const parts: string[] = [];

    // 语义相似度评价
    if (semanticSimilarity > 0.8) {
      parts.push('内容高度相关');
    } else if (semanticSimilarity > 0.6) {
      parts.push('内容较为相关');
    } else if (semanticSimilarity > 0.4) {
      parts.push('内容有一定关联');
    } else {
      parts.push('内容关联度较低');
    }

    // 意图对齐评价
    if (intentAlignment > 0.7) {
      parts.push('需求匹配度好');
    } else if (intentAlignment < 0.4) {
      parts.push('需求匹配度有待提升');
    }

    // 约束兼容性评价
    if (constraintCompatibility < 0.5) {
      parts.push('存在约束冲突');
    } else if (constraintCompatibility > 0.8) {
      parts.push('约束条件兼容');
    }

    // 关键词匹配
    if (matchedKeywords.length > 0) {
      parts.push(`共同关注点: ${matchedKeywords.slice(0, 3).join(', ')}`);
    }

    return parts.join('；');
  }

  /**
   * 批量计算 L3 匹配
   */
  async batchCalculate(
    supply: L3SemanticData,
    demands: L3SemanticData[]
  ): Promise<Array<{ demandId: string; result: L3MatchResult }>> {
    const results = await Promise.all(
      demands.map(async (demand, index) => ({
        demandId: `demand_${index}`,
        result: await this.calculate(supply, demand),
      }))
    );
    return results;
  }
}

export default L3Matcher;
