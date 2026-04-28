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
/**
 * Quality Assessment Result
 */
export interface SupplyQualityAssessment {
    supplyId: string;
    completenessScore: number;
    credibilityScore: number;
    competitivenessScore: number;
    overallScore: number;
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
    impact: number;
}
/**
 * Supply Quality Assessor Class
 * 供给质量评估器
 */
export declare class SupplyQualityAssessor {
    /**
     * Assess supply quality
     */
    assess(supply: Supply): SupplyQualityAssessment;
    /**
     * Assess completeness - how much of the expected data is filled in
     */
    private assessCompleteness;
    /**
     * Assess credibility - how believable and consistent the information is
     */
    private assessCredibility;
    /**
     * Assess competitiveness - how the supply compares to typical market offerings
     */
    private assessCompetitiveness;
    /**
     * Generate optimization suggestions
     */
    private generateOptimizationSuggestions;
    /**
     * Convert score to grade
     */
    private scoreToGrade;
}
export declare const supplyQualityAssessor: SupplyQualityAssessor;
//# sourceMappingURL=supplyQualityAssessor.d.ts.map