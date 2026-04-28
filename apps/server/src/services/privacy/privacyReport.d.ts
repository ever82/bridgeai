/**
 * Privacy Report Service
 * Generates comprehensive privacy reports with detection logs, risk ratings, and comparisons
 */
import { DetectionResult } from '../ai/sensitiveContentDetection';
import { DesensitizationRegion } from '../image/desensitization';
import { ProcessingStep } from '../image/desensitization';
export interface PrivacyReport {
    id: string;
    imageId: string;
    userId: string;
    createdAt: Date;
    summary: PrivacySummary;
    detectedItems: DetectedItem[];
    processingLog: ProcessingLogEntry[];
    riskAssessment: RiskAssessment;
    comparison: BeforeAfterComparison;
    exportData: ExportData;
}
export interface PrivacySummary {
    totalDetections: number;
    processedRegions: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    processingTime: number;
    templateUsed: string;
}
export interface DetectedItem {
    id: string;
    type: string;
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    confidence: number;
    status: 'detected' | 'processed' | 'whitelisted' | 'ignored';
    method?: string;
    intensity?: number;
    metadata?: Record<string, unknown>;
}
export interface ProcessingLogEntry {
    timestamp: Date;
    action: string;
    details: Record<string, unknown>;
    duration?: number;
}
export interface RiskAssessment {
    overallScore: number;
    level: 'low' | 'medium' | 'high' | 'critical';
    breakdown: RiskBreakdown[];
    recommendations: RiskRecommendation[];
}
export interface RiskBreakdown {
    type: string;
    count: number;
    score: number;
    weight: number;
}
export interface RiskRecommendation {
    priority: 'low' | 'medium' | 'high';
    message: string;
    action?: string;
}
export interface BeforeAfterComparison {
    hasComparison: boolean;
    originalSize: number;
    processedSize: number;
    sizeChange: number;
    regionsChanged: number;
    visualDiffScore: number;
}
export interface ExportData {
    pdfUrl?: string;
    jsonData: string;
    shareToken?: string;
    expiresAt?: Date;
}
export interface ReportOptions {
    includeComparison: boolean;
    includeProcessingSteps: boolean;
    includeMetadata: boolean;
    format: 'full' | 'summary' | 'technical';
}
/**
 * Generate a comprehensive privacy report
 */
export declare function generatePrivacyReport(imageId: string, userId: string, detections: DetectionResult[], appliedRegions: DesensitizationRegion[], processingSteps: ProcessingStep[], originalSize: number, processedSize: number, templateUsed?: string): PrivacyReport;
/**
 * Export report as JSON
 */
export declare function exportReportAsJson(report: PrivacyReport): string;
/**
 * Export report summary as text
 */
export declare function exportReportAsText(report: PrivacyReport): string;
/**
 * Generate share token for report
 */
export declare function generateShareToken(reportId: string): string;
/**
 * Create a summary report from full report
 */
export declare function createSummaryReport(report: PrivacyReport): Partial<PrivacyReport>;
/**
 * Batch generate reports for multiple images
 */
export declare function batchGenerateReports(reportsData: Array<{
    imageId: string;
    userId: string;
    detections: DetectionResult[];
    appliedRegions: DesensitizationRegion[];
    processingSteps: ProcessingStep[];
    originalSize: number;
    processedSize: number;
}>): PrivacyReport[];
/**
 * Get statistics from multiple reports
 */
export declare function getReportsStatistics(reports: PrivacyReport[]): {
    totalReports: number;
    avgRiskScore: number;
    riskLevelDistribution: Record<string, number>;
    totalDetections: number;
    avgProcessingTime: number;
};
//# sourceMappingURL=privacyReport.d.ts.map