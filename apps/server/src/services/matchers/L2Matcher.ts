/**
 * L2 Matcher - 结构化信息匹配
 * 匹配供需双方的详细结构化数据（价格、规格、数量等）
 */

export interface L2StructuredData {
  price?: {
    min?: number;
    max?: number;
    unit?: string;
    currency?: string;
  };
  quantity?: {
    min?: number;
    max?: number;
    unit?: string;
  };
  specifications: Record<string, string | number | boolean>;
  requirements: string[];
  conditions: string[];
}

export interface L2MatchOptions {
  priceTolerancePercent?: number;  // 价格容差百分比
  quantityTolerancePercent?: number; // 数量容差百分比
}

const DEFAULT_OPTIONS: L2MatchOptions = {
  priceTolerancePercent: 20,
  quantityTolerancePercent: 30,
};

export class L2Matcher {
  private options: L2MatchOptions;

  constructor(options: Partial<L2MatchOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 计算 L2 匹配分数
   */
  calculate(supply: L2StructuredData, demand: L2StructuredData): number {
    const scores = [
      this.matchPrice(supply.price, demand.price),
      this.matchQuantity(supply.quantity, demand.quantity),
      this.matchSpecifications(supply.specifications, demand.specifications),
      this.matchRequirements(supply.requirements, demand.requirements),
      this.matchConditions(supply.conditions, demand.conditions),
    ];

    // 计算加权平均分
    const weights = [0.3, 0.25, 0.25, 0.1, 0.1];
    const weightedScore = scores.reduce((sum, score, i) => sum + score * weights[i], 0);

    return Math.min(Math.max(weightedScore, 0), 1);
  }

  /**
   * 匹配价格
   */
  private matchPrice(
    supplyPrice?: L2StructuredData['price'],
    demandPrice?: L2StructuredData['price']
  ): number {
    if (!supplyPrice || !demandPrice) {
      return 0.5; // 无价格信息视为中性
    }

    // 获取价格范围
    const supplyMin = supplyPrice.min || 0;
    const supplyMax = supplyPrice.max || supplyMin;
    const demandMin = demandPrice.min || 0;
    const demandMax = demandPrice.max || demandMin;

    // 单位检查
    if (supplyPrice.unit && demandPrice.unit && supplyPrice.unit !== demandPrice.unit) {
      return 0.2; // 单位不匹配
    }

    if (supplyPrice.currency && demandPrice.currency && supplyPrice.currency !== demandPrice.currency) {
      return 0.2; // 货币不匹配
    }

    // 计算价格重叠
    const overlapStart = Math.max(supplyMin, demandMin);
    const overlapEnd = Math.min(supplyMax, demandMax);

    if (overlapEnd < overlapStart) {
      // 无重叠，计算差距
      const gap = overlapStart - overlapEnd;
      const avgPrice = (supplyMin + supplyMax + demandMin + demandMax) / 4 || 1;
      const gapPercent = (gap / avgPrice) * 100;

      if (gapPercent <= this.options.priceTolerancePercent! / 2) return 0.6;
      if (gapPercent <= this.options.priceTolerancePercent!) return 0.4;
      return 0.2;
    }

    // 有重叠
    const overlapSize = overlapEnd - overlapStart;
    const supplyRange = supplyMax - supplyMin || 1;
    const demandRange = demandMax - demandMin || 1;
    const minRange = Math.min(supplyRange, demandRange);

    const overlapRatio = overlapSize / minRange;

    if (overlapRatio >= 0.8) return 1;
    if (overlapRatio >= 0.5) return 0.85;
    if (overlapRatio >= 0.3) return 0.7;
    return 0.55;
  }

  /**
   * 匹配数量
   */
  private matchQuantity(
    supplyQty?: L2StructuredData['quantity'],
    demandQty?: L2StructuredData['quantity']
  ): number {
    if (!supplyQty || !demandQty) {
      return 0.5; // 无数量信息视为中性
    }

    // 单位检查
    if (supplyQty.unit && demandQty.unit && supplyQty.unit !== demandQty.unit) {
      return 0.3;
    }

    const supplyMin = supplyQty.min || 0;
    const supplyMax = supplyQty.max || supplyMin;
    const demandMin = demandQty.min || 0;
    const demandMax = demandQty.max || demandMin;

    // 检查供需匹配
    const canSupply = supplyMax >= demandMin;
    const meetsDemand = supplyMin <= demandMax;

    if (!canSupply || !meetsDemand) {
      // 不匹配，计算差距
      const gap = canSupply
        ? demandMax - supplyMax
        : demandMin - supplyMin;
      const avgQty = (supplyMin + supplyMax + demandMin + demandMax) / 4 || 1;
      const gapPercent = (Math.abs(gap) / avgQty) * 100;

      if (gapPercent <= this.options.quantityTolerancePercent! / 2) return 0.6;
      if (gapPercent <= this.options.quantityTolerancePercent!) return 0.4;
      return 0.2;
    }

    // 计算匹配程度
    const overlapStart = Math.max(supplyMin, demandMin);
    const overlapEnd = Math.min(supplyMax, demandMax);

    if (overlapEnd >= overlapStart) {
      const overlapSize = overlapEnd - overlapStart;
      const demandRange = demandMax - demandMin || 1;
      const coverageRatio = overlapSize / demandRange;

      if (coverageRatio >= 0.9) return 1;
      if (coverageRatio >= 0.7) return 0.85;
      if (coverageRatio >= 0.5) return 0.7;
      return 0.55;
    }

    return 0.5;
  }

  /**
   * 匹配规格参数
   */
  private matchSpecifications(
    supplySpec: L2StructuredData['specifications'],
    demandSpec: L2StructuredData['specifications']
  ): number {
    const supplyKeys = Object.keys(supplySpec);
    const demandKeys = Object.keys(demandSpec);

    if (supplyKeys.length === 0 || demandKeys.length === 0) {
      return 0.5;
    }

    let matchCount = 0;
    let mismatchCount = 0;

    for (const key of demandKeys) {
      if (!(key in supplySpec)) {
        mismatchCount++;
        continue;
      }

      const supplyVal = supplySpec[key];
      const demandVal = demandSpec[key];

      if (this.valuesMatch(supplyVal, demandVal)) {
        matchCount++;
      } else {
        mismatchCount++;
      }
    }

    const totalChecked = matchCount + mismatchCount;
    if (totalChecked === 0) return 0.5;

    const matchRatio = matchCount / totalChecked;

    // 考虑覆盖度
    const coverageRatio = totalChecked / demandKeys.length;

    return matchRatio * 0.7 + coverageRatio * 0.3;
  }

  /**
   * 判断两个值是否匹配
   */
  private valuesMatch(val1: unknown, val2: unknown): boolean {
    if (val1 === val2) return true;
    if (typeof val1 !== typeof val2) return false;

    if (typeof val1 === 'number' && typeof val2 === 'number') {
      // 数值容差
      const tolerance = Math.abs(val2) * 0.1;
      return Math.abs(val1 - val2) <= tolerance;
    }

    if (typeof val1 === 'string' && typeof val2 === 'string') {
      return val1.toLowerCase() === val2.toLowerCase();
    }

    return false;
  }

  /**
   * 匹配需求列表
   */
  private matchRequirements(
    supplyReq: string[],
    demandReq: string[]
  ): number {
    if (demandReq.length === 0) return 1; // 无需求即满足
    if (supplyReq.length === 0) return 0.3; // 无能力但需满足需求

    const supplySet = new Set(supplyReq.map((r) => r.toLowerCase()));
    let matchCount = 0;

    for (const req of demandReq) {
      const reqLower = req.toLowerCase();
      if (supplySet.has(reqLower)) {
        matchCount++;
      }
    }

    return matchCount / demandReq.length;
  }

  /**
   * 匹配条件列表
   */
  private matchConditions(
    supplyCond: string[],
    demandCond: string[]
  ): number {
    // 类似 requirements 的逻辑
    if (demandCond.length === 0) return 1;
    if (supplyCond.length === 0) return 0.5;

    const supplySet = new Set(supplyCond.map((c) => c.toLowerCase()));
    let matchCount = 0;

    for (const cond of demandCond) {
      const condLower = cond.toLowerCase();
      if (supplySet.has(condLower)) {
        matchCount++;
      }
    }

    return matchCount / demandCond.length;
  }

  /**
   * 批量计算 L2 匹配
   */
  batchCalculate(
    supply: L2StructuredData,
    demands: L2StructuredData[]
  ): Array<{ demandId: string; score: number }> {
    return demands.map((demand, index) => ({
      demandId: `demand_${index}`,
      score: this.calculate(supply, demand),
    }));
  }
}

export default L2Matcher;
