/**
 * L1 Matcher - 基础属性匹配
 * 匹配供需双方的基础属性（类别、位置、时间等）
 */

export interface L1Attributes {
  category: string;
  subCategory?: string;
  location: {
    lat: number;
    lng: number;
    city?: string;
    district?: string;
  };
  timeRange: {
    start: Date;
    end: Date;
  };
  tags: string[];
}

export interface L1MatchOptions {
  locationRadiusKm?: number;    // 地理位置匹配半径（公里）
  timeToleranceHours?: number;  // 时间匹配容差（小时）
  tagMatchThreshold?: number;   // 标签匹配阈值
}

const DEFAULT_OPTIONS: L1MatchOptions = {
  locationRadiusKm: 10,
  timeToleranceHours: 24,
  tagMatchThreshold: 0.5,
};

export class L1Matcher {
  private options: L1MatchOptions;

  constructor(options: Partial<L1MatchOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 计算 L1 匹配分数
   */
  calculate(supply: L1Attributes, demand: L1Attributes): number {
    const scores = [
      this.matchCategory(supply.category, demand.category, supply.subCategory, demand.subCategory),
      this.matchLocation(supply.location, demand.location),
      this.matchTime(supply.timeRange, demand.timeRange),
      this.matchTags(supply.tags, demand.tags),
    ];

    // 计算加权平均分
    const weights = [0.35, 0.3, 0.2, 0.15];
    const weightedScore = scores.reduce((sum, score, i) => sum + score * weights[i], 0);

    return Math.min(Math.max(weightedScore, 0), 1);
  }

  /**
   * 匹配类别
   */
  private matchCategory(
    cat1: string,
    cat2: string,
    sub1?: string,
    sub2?: string
  ): number {
    // 主类别匹配
    if (cat1 !== cat2) {
      return 0;
    }

    // 子类别匹配
    if (!sub1 || !sub2) {
      return 0.8; // 有主类别但无子类别
    }

    if (sub1 === sub2) {
      return 1; // 完全匹配
    }

    // 检查子类别相关性（简化实现）
    return 0.6;
  }

  /**
   * 匹配地理位置
   * 使用 Haversine 公式计算距离
   */
  private matchLocation(
    loc1: L1Attributes['location'],
    loc2: L1Attributes['location']
  ): number {
    const distance = this.calculateDistance(
      loc1.lat,
      loc1.lng,
      loc2.lat,
      loc2.lng
    );

    // 相同城市加分
    const sameCity = loc1.city && loc2.city && loc1.city === loc2.city;
    const sameDistrict = loc1.district && loc2.district && loc1.district === loc2.district;

    if (distance === 0) return 1;
    if (distance <= 1) return 0.95; // 1km 内
    if (distance <= 3) return 0.85; // 3km 内
    if (distance <= 5) return 0.75; // 5km 内
    if (distance <= 10) return 0.65;
    if (sameDistrict && distance <= this.options.locationRadiusKm!) return 0.55;
    if (sameCity && distance <= this.options.locationRadiusKm! * 2) return 0.45;

    return 0;
  }

  /**
   * 计算两点间距离（公里）
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // 地球半径（公里）
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * 匹配时间范围
   */
  private matchTime(
    time1: L1Attributes['timeRange'],
    time2: L1Attributes['timeRange']
  ): number {
    const start1 = new Date(time1.start).getTime();
    const end1 = new Date(time1.end).getTime();
    const start2 = new Date(time2.start).getTime();
    const end2 = new Date(time2.end).getTime();

    // 计算重叠时间
    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);

    if (overlapEnd <= overlapStart) {
      // 无重叠，计算时间间隔
      const gap = Math.min(
        Math.abs(start2 - end1),
        Math.abs(start1 - end2)
      );
      const gapHours = gap / (1000 * 60 * 60);

      if (gapHours <= this.options.timeToleranceHours! / 4) return 0.6;
      if (gapHours <= this.options.timeToleranceHours! / 2) return 0.4;
      if (gapHours <= this.options.timeToleranceHours!) return 0.2;
      return 0;
    }

    // 有重叠
    const overlapDuration = overlapEnd - overlapStart;
    const duration1 = end1 - start1;
    const duration2 = end2 - start2;
    const minDuration = Math.min(duration1, duration2);

    const overlapRatio = overlapDuration / minDuration;

    if (overlapRatio >= 0.8) return 1;
    if (overlapRatio >= 0.5) return 0.85;
    if (overlapRatio >= 0.3) return 0.7;
    return 0.5;
  }

  /**
   * 匹配标签
   */
  private matchTags(tags1: string[], tags2: string[]): number {
    if (tags1.length === 0 || tags2.length === 0) {
      return 0.5; // 无标签视为中性
    }

    const set1 = new Set(tags1.map((t) => t.toLowerCase()));
    const set2 = new Set(tags2.map((t) => t.toLowerCase()));

    // 计算交集
    const intersection = new Set(set1);
    for (const tag of intersection) {
      if (!set2.has(tag)) {
        intersection.delete(tag);
      }
    }

    // 计算并集
    const union = new Set([...set1, ...set2]);

    // Jaccard 相似度
    const jaccard = intersection.size / union.size;

    // 考虑匹配数量
    const matchCount = intersection.size;
    const countScore = Math.min(matchCount / 3, 1); // 最多计 3 个匹配

    // 综合分数
    return jaccard * 0.6 + countScore * 0.4;
  }

  /**
   * 批量计算 L1 匹配
   */
  batchCalculate(
    supply: L1Attributes,
    demands: L1Attributes[]
  ): Array<{ demandId: string; score: number }> {
    return demands.map((demand, index) => ({
      demandId: `demand_${index}`,
      score: this.calculate(supply, demand),
    }));
  }
}

export default L1Matcher;
