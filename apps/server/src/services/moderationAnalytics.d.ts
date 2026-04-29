/**
 * Moderation Analytics Service
 * 审核数据统计分析服务
 *
 * 提供举报统计、违规分析、审核效率等数据
 */
export interface OverviewStats {
    totalReports: number;
    pendingReports: number;
    resolvedReports: number;
    dismissedReports: number;
    averageProcessingTimeHours: number;
}
export declare function getOverview(startDate?: Date, endDate?: Date): Promise<OverviewStats>;
export type Granularity = 'daily' | 'weekly' | 'monthly';
export interface TrendPoint {
    date: string;
    count: number;
}
export declare function getReportTrends(startDate?: Date, endDate?: Date, granularity?: Granularity): Promise<TrendPoint[]>;
export interface ViolationBreakdown {
    type: string;
    count: number;
    percentage: number;
}
export declare function getViolationTypeBreakdown(startDate?: Date, endDate?: Date): Promise<ViolationBreakdown[]>;
export interface ContentTypeBreakdown {
    type: string;
    count: number;
    percentage: number;
}
export declare function getContentTypeBreakdown(startDate?: Date, endDate?: Date): Promise<ContentTypeBreakdown[]>;
export interface ModerationEfficiency {
    averageTimeToFirstReviewHours: number;
    averageTimeToResolutionHours: number;
    resolutionRate: number;
    backlogSize: number;
}
export declare function getModerationEfficiency(startDate?: Date, endDate?: Date): Promise<ModerationEfficiency>;
export interface ReportAccuracy {
    reportsLeadingToAction: number;
    dismissedReports: number;
    falsePositiveRate: number;
}
export declare function getReportAccuracy(startDate?: Date, endDate?: Date): Promise<ReportAccuracy>;
export interface ModeratorPerformance {
    moderatorId: string;
    totalReviewed: number;
    resolvedCount: number;
    dismissedCount: number;
    averageReviewTimeHours: number;
}
export declare function getModeratorPerformance(moderatorId?: string, startDate?: Date, endDate?: Date): Promise<ModeratorPerformance[]>;
//# sourceMappingURL=moderationAnalytics.d.ts.map