/**
 * Supply Quality Assessor
 * 供给质量评估系统
 *
 * 功能：
 * - 描述完整性评分
 * - 信息可信度评估
 * - 竞争力分析
 * - 优化建议生成
 * - 质量等级划分
 */

import { Supply } from '../supplyExtractionService';
import { logger } from '../../../utils/logger';

/**
 * Quality Assessment Result
 */
export interface SupplyQualityAssessment {
  supplyId: string;
  completenessScore: number; // 0-100
  credibilityScore: number; // 0-100
  competitivenessScore: number; // 0-100
  overallScore: number; // 0-100
  grade: QualityGrade;
  optimizationSuggestions: OptimizationSuggestion[];
  assessedAt: string;
}

/**
 * Quality Grade
 */
export type QualityGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Optimization Suggestion
 */
export interface OptimizationSuggestion {
  field: string;
  type: 'add_missing' | 'improve_quality' | 'increase_detail' | 'fix_inconsistency';
  priority: 'high' | 'medium' | 'low';
  message: string;
  impact: number; // estimated score improvement 0-100
}

/**
 * Scoring weights
 */
const SCORING_WEIGHTS = {
  completeness: 0.4,
  credibility: 0.35,
  competitiveness: 0.25,
};

/**
 * Supply Quality Assessor Class
 * 供给质量评估器
 */
export class SupplyQualityAssessor {
  /**
   * Assess supply quality
   */
  assess(supply: Supply): SupplyQualityAssessment {
    const startTime = Date.now();

    try {
      const completenessScore = this.assessCompleteness(supply);
      const credibilityScore = this.assessCredibility(supply);
      const competitivenessScore = this.assessCompetitiveness(supply);

      const overallScore = Math.round(
        completenessScore * SCORING_WEIGHTS.completeness +
          credibilityScore * SCORING_WEIGHTS.credibility +
          competitivenessScore * SCORING_WEIGHTS.competitiveness
      );

      const grade = this.scoreToGrade(overallScore);
      const suggestions = this.generateOptimizationSuggestions(supply, {
        completenessScore,
        credibilityScore,
        competitivenessScore,
      });

      logger.info('Supply quality assessment completed', {
        supplyId: supply.id,
        overallScore,
        grade,
        latencyMs: Date.now() - startTime,
      });

      return {
        supplyId: supply.id || 'unknown',
        completenessScore,
        credibilityScore,
        competitivenessScore,
        overallScore,
        grade,
        optimizationSuggestions: suggestions,
        assessedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Supply quality assessment failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        supplyId: supply.id || 'unknown',
        completenessScore: 0,
        credibilityScore: 0,
        competitivenessScore: 0,
        overallScore: 0,
        grade: 'F',
        optimizationSuggestions: [],
        assessedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Assess completeness - how much of the expected data is filled in
   */
  private assessCompleteness(supply: Supply): number {
    let score = 0;
    let totalWeight = 0;

    // Title (weight: 15)
    const titleWeight = 15;
    totalWeight += titleWeight;
    if (supply.title && supply.title.length >= 5) {
      score += supply.title.length >= 10 ? titleWeight : titleWeight * 0.7;
    }

    // Description (weight: 20)
    const descWeight = 20;
    totalWeight += descWeight;
    if (supply.description) {
      if (supply.description.length >= 100) {
        score += descWeight;
      } else if (supply.description.length >= 50) {
        score += descWeight * 0.7;
      } else if (supply.description.length >= 20) {
        score += descWeight * 0.4;
      } else {
        score += descWeight * 0.2;
      }
    }

    // Service type (weight: 10)
    const typeWeight = 10;
    totalWeight += typeWeight;
    if (supply.serviceType && supply.serviceType !== 'general') {
      score += typeWeight;
    } else if (supply.serviceType) {
      score += typeWeight * 0.3;
    }

    // Capabilities (weight: 20)
    const capWeight = 20;
    totalWeight += capWeight;
    if (supply.capabilities?.length > 0) {
      const capScore = Math.min(supply.capabilities.length / 3, 1) * capWeight;
      // Bonus for having levels set
      const hasLevels =
        supply.capabilities.filter(c => c.level).length / supply.capabilities.length;
      score += capScore * (0.7 + hasLevels * 0.3);
    }

    // Pricing (weight: 15)
    const priceWeight = 15;
    totalWeight += priceWeight;
    if (supply.pricing) {
      let priceScore = 0;
      if (supply.pricing.type) priceScore += 0.3;
      if (supply.pricing.currency) priceScore += 0.2;
      if (supply.pricing.minRate !== undefined || supply.pricing.maxRate !== undefined)
        priceScore += 0.5;
      score += priceScore * priceWeight;
    }

    // Skills (weight: 10)
    const skillWeight = 10;
    totalWeight += skillWeight;
    if (supply.skills?.length > 0) {
      score += Math.min(supply.skills.length / 5, 1) * skillWeight;
    }

    // Experience (weight: 5)
    const expWeight = 5;
    totalWeight += expWeight;
    if (supply.experience) {
      let expScore = 0;
      if (supply.experience.years !== undefined) expScore += 0.4;
      if (supply.experience.certifications?.length) expScore += 0.3;
      if (supply.experience.totalProjects !== undefined) expScore += 0.3;
      score += expScore * expWeight;
    }

    // Location (weight: 5)
    const locWeight = 5;
    totalWeight += locWeight;
    if (supply.location) {
      let locScore = 0;
      if (supply.location.city) locScore += 0.4;
      if (supply.location.remote !== undefined || supply.location.onsite !== undefined)
        locScore += 0.6;
      score += locScore * locWeight;
    }

    return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
  }

  /**
   * Assess credibility - how believable and consistent the information is
   */
  private assessCredibility(supply: Supply): number {
    const score = 100;
    let deductions = 0;

    // Check for inconsistencies
    // 1. Pricing range consistency
    if (supply.pricing?.minRate !== undefined && supply.pricing?.maxRate !== undefined) {
      if (supply.pricing.minRate > supply.pricing.maxRate) {
        deductions += 20; // Min > Max is suspicious
      }
      if (supply.pricing.maxRate / supply.pricing.minRate > 10) {
        deductions += 10; // Too wide a range is suspicious
      }
    }

    // 2. Title vs serviceType consistency
    if (supply.title && supply.serviceType) {
      const titleLower = supply.title.toLowerCase();
      const typeLower = supply.serviceType.toLowerCase();
      if (!titleLower.includes(typeLower) && !typeLower.includes(titleLower.substring(0, 5))) {
        deductions += 5; // Mild inconsistency
      }
    }

    // 3. Capability descriptions vs skills overlap
    if (supply.capabilities?.length > 0 && supply.skills?.length > 0) {
      const capKeywords = supply.capabilities.flatMap(c => [c.name, ...(c.keywords || [])]);
      const skillOverlap = supply.skills.filter(s =>
        capKeywords.some(
          k =>
            k.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(k.toLowerCase())
        )
      );
      if (skillOverlap.length === 0 && supply.skills.length > 3) {
        deductions += 10; // Skills completely unrelated to capabilities
      }
    }

    // 4. Experience plausibility
    if (supply.experience?.years !== undefined) {
      if (supply.experience.years < 0 || supply.experience.years > 50) {
        deductions += 15;
      }
    }

    // 5. Quality score consistency
    if (supply.quality) {
      const scoreRange =
        Math.max(
          supply.quality.overallScore,
          supply.quality.completenessScore,
          supply.quality.clarityScore,
          supply.quality.relevanceScore
        ) -
        Math.min(
          supply.quality.overallScore,
          supply.quality.completenessScore,
          supply.quality.clarityScore,
          supply.quality.relevanceScore
        );
      if (scoreRange > 50) {
        deductions += 10; // Large variance in quality scores
      }
    }

    return Math.max(0, Math.min(100, score - deductions));
  }

  /**
   * Assess competitiveness - how the supply compares to typical market offerings
   */
  private assessCompetitiveness(supply: Supply): number {
    let score = 40; // Baseline

    // Detail level bonus
    if (supply.description?.length > 200) score += 10;
    if (supply.capabilities?.length >= 3) score += 10;
    if (supply.skills?.length >= 5) score += 5;

    // Experience bonus
    if (supply.experience?.years !== undefined) {
      if (supply.experience.years >= 5) score += 10;
      else if (supply.experience.years >= 3) score += 5;
    }

    // Certifications bonus
    if (supply.experience?.certifications?.length) {
      score += Math.min(supply.experience.certifications.length * 3, 10);
    }

    // Portfolio bonus
    if (supply.experience?.portfolio?.length) {
      score += Math.min(supply.experience.portfolio.length * 2, 5);
    }

    // Pricing transparency bonus
    if (
      supply.pricing?.type === 'range' ||
      supply.pricing?.type === 'hourly' ||
      supply.pricing?.type === 'fixed'
    ) {
      score += 5;
    }

    return Math.min(100, score);
  }

  /**
   * Generate optimization suggestions
   */
  private generateOptimizationSuggestions(
    supply: Supply,
    scores: { completenessScore: number; credibilityScore: number; competitivenessScore: number }
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Completeness-based suggestions
    if (!supply.title || supply.title.length < 5) {
      suggestions.push({
        field: 'title',
        type: 'add_missing',
        priority: 'high',
        message: '添加清晰的供给标题，建议至少10个字符',
        impact: 15,
      });
    }

    if (!supply.description || supply.description.length < 50) {
      suggestions.push({
        field: 'description',
        type: 'increase_detail',
        priority: 'high',
        message: '详细描述服务内容和特色，建议至少100个字符',
        impact: 20,
      });
    }

    if (!supply.capabilities?.length) {
      suggestions.push({
        field: 'capabilities',
        type: 'add_missing',
        priority: 'high',
        message: '添加至少3个核心能力，包含等级描述',
        impact: 20,
      });
    }

    if (!supply.skills?.length) {
      suggestions.push({
        field: 'skills',
        type: 'add_missing',
        priority: 'medium',
        message: '添加相关技能标签以提高搜索匹配度',
        impact: 10,
      });
    }

    if (!supply.pricing || !supply.pricing.type) {
      suggestions.push({
        field: 'pricing',
        type: 'add_missing',
        priority: 'high',
        message: '明确定价方式和价格范围',
        impact: 15,
      });
    } else if (!supply.pricing.minRate && !supply.pricing.maxRate) {
      suggestions.push({
        field: 'pricing.rates',
        type: 'increase_detail',
        priority: 'medium',
        message: '提供具体价格范围以提高信任度',
        impact: 10,
      });
    }

    if (!supply.experience?.years) {
      suggestions.push({
        field: 'experience.years',
        type: 'add_missing',
        priority: 'medium',
        message: '提供从业年限信息',
        impact: 5,
      });
    }

    if (!supply.experience?.certifications?.length) {
      suggestions.push({
        field: 'experience.certifications',
        type: 'improve_quality',
        priority: 'low',
        message: '添加专业认证可提升可信度',
        impact: 5,
      });
    }

    if (
      !supply.location ||
      (supply.location.remote === undefined && supply.location.onsite === undefined)
    ) {
      suggestions.push({
        field: 'location',
        type: 'add_missing',
        priority: 'medium',
        message: '说明服务提供方式（远程/现场/混合）',
        impact: 5,
      });
    }

    // Credibility-based suggestions — always flag pricing inconsistencies
    if (supply.pricing?.minRate !== undefined && supply.pricing?.maxRate !== undefined) {
      if (supply.pricing.minRate > supply.pricing.maxRate) {
        suggestions.push({
          field: 'pricing',
          type: 'fix_inconsistency',
          priority: 'high',
          message: '最低价高于最高价，请检查定价信息',
          impact: 20,
        });
      }
    }

    // Competitiveness-based suggestions
    if (scores.competitivenessScore < 60) {
      if (!supply.experience?.portfolio?.length) {
        suggestions.push({
          field: 'experience.portfolio',
          type: 'improve_quality',
          priority: 'medium',
          message: '添加作品集链接可显著提升竞争力',
          impact: 5,
        });
      }
    }

    // Sort by priority and impact
    const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
    suggestions.sort((a, b) => {
      const pDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return b.impact - a.impact;
    });

    return suggestions;
  }

  /**
   * Convert score to grade
   */
  private scoreToGrade(score: number): QualityGrade {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}

// Export singleton instance
export const supplyQualityAssessor = new SupplyQualityAssessor();
