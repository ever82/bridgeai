/**
 * Moderation Analytics Service
 * 审核数据统计分析服务
 *
 * 提供举报统计、违规分析、审核效率等数据
 */

import { prisma } from '../db/client';
import { logger } from '../utils/logger';

// ============================================
// Date filter helper
// ============================================

function buildDateFilter(startDate?: Date, endDate?: Date) {
  const where: any = {};
  if (startDate) {
    where.gte = startDate;
  }
  if (endDate) {
    where.lte = endDate;
  }
  return Object.keys(where).length > 0 ? where : undefined;
}

// ============================================
// Overview statistics
// ============================================

export interface OverviewStats {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  dismissedReports: number;
  averageProcessingTimeHours: number;
}

export async function getOverview(
  startDate?: Date,
  endDate?: Date
): Promise<OverviewStats> {
  const dateFilter = buildDateFilter(startDate, endDate);
  const createdAtFilter = dateFilter ? { createdAt: dateFilter } : {};

  // General reports (Report model)
  const reportCounts = await prisma.report.groupBy({
    by: ['status'],
    _count: { id: true },
    where: {
      createdAt: dateFilter,
    },
  });

  // Review reports
  const reviewReportCounts = await prisma.reviewReport.groupBy({
    by: ['status'],
    _count: { id: true },
    where: {
      createdAt: dateFilter,
    },
  });

  // Combine counts
  let totalReports = 0;
  let pendingReports = 0;
  let resolvedReports = 0;
  let dismissedReports = 0;

  for (const r of reportCounts) {
    const count = r._count.id;
    totalReports += count;
    if (r.status === 'PENDING') pendingReports += count;
    if (r.status === 'RESOLVED') resolvedReports += count;
    if (r.status === 'DISMISSED') dismissedReports += count;
  }

  for (const r of reviewReportCounts) {
    const count = r._count.id;
    totalReports += count;
    if (r.status === 'PENDING') pendingReports += count;
    if (r.status === 'RESOLVED') resolvedReports += count;
    if (r.status === 'DISMISSED') dismissedReports += count;
  }

  // Average processing time: handledAt - createdAt for resolved/dismissed reports
  const processedReports = await prisma.report.findMany({
    where: {
      createdAt: dateFilter,
      status: { in: ['RESOLVED', 'DISMISSED'] },
      handledAt: { not: null },
    },
    select: { createdAt: true, handledAt: true },
  });

  const reviewProcessed = await prisma.reviewReport.findMany({
    where: {
      createdAt: dateFilter,
      status: { in: ['RESOLVED', 'DISMISSED'] },
      handledAt: { not: null },
    },
    select: { createdAt: true, handledAt: true },
  });

  const allProcessed = [...processedReports, ...reviewProcessed];
  let averageProcessingTimeHours = 0;

  if (allProcessed.length > 0) {
    const totalMs = allProcessed.reduce((sum, r) => {
      return sum + (r.handledAt!.getTime() - r.createdAt.getTime());
    }, 0);
    averageProcessingTimeHours = totalMs / allProcessed.length / (1000 * 60 * 60);
  }

  return {
    totalReports,
    pendingReports,
    resolvedReports,
    dismissedReports,
    averageProcessingTimeHours: Math.round(averageProcessingTimeHours * 100) / 100,
  };
}

// ============================================
// Report volume trends over time
// ============================================

export type Granularity = 'daily' | 'weekly' | 'monthly';

export interface TrendPoint {
  date: string;
  count: number;
}

export async function getReportTrends(
  startDate?: Date,
  endDate?: Date,
  granularity: Granularity = 'daily'
): Promise<TrendPoint[]> {
  const dateFilter = buildDateFilter(startDate, endDate);

  // Fetch all reports with createdAt in range
  const reports = await prisma.report.findMany({
    where: { createdAt: dateFilter },
    select: { createdAt: true, status: true },
    orderBy: { createdAt: 'asc' },
  });

  const reviewReports = await prisma.reviewReport.findMany({
    where: { createdAt: dateFilter },
    select: { createdAt: true, status: true },
    orderBy: { createdAt: 'asc' },
  });

  const allReports = [...reports, ...reviewReports];

  // Group by granularity
  const groups: Record<string, number> = {};

  for (const r of allReports) {
    const d = r.createdAt;
    let key: string;
    if (granularity === 'daily') {
      key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    } else if (granularity === 'weekly') {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      key = weekStart.toISOString().slice(0, 10);
    } else {
      key = d.toISOString().slice(0, 7); // YYYY-MM
    }
    groups[key] = (groups[key] || 0) + 1;
  }

  // Sort and return
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

// ============================================
// Violation type breakdown
// ============================================

export interface ViolationBreakdown {
  type: string;
  count: number;
  percentage: number;
}

export async function getViolationTypeBreakdown(
  startDate?: Date,
  endDate?: Date
): Promise<ViolationBreakdown[]> {
  const dateFilter = buildDateFilter(startDate, endDate);

  const reportByReason = await prisma.report.groupBy({
    by: ['reason'],
    _count: { id: true },
    where: { createdAt: dateFilter },
  });

  const reviewReportByReason = await prisma.reviewReport.groupBy({
    by: ['reason'],
    _count: { id: true },
    where: { createdAt: dateFilter },
  });

  // Combine reason counts
  const reasonCounts: Record<string, number> = {};

  for (const r of reportByReason) {
    reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + r._count.id;
  }
  for (const r of reviewReportByReason) {
    reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + r._count.id;
  }

  const total = Object.values(reasonCounts).reduce((sum, c) => sum + c, 0);

  return Object.entries(reasonCounts)
    .map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

// ============================================
// Content type breakdown
// ============================================

export interface ContentTypeBreakdown {
  type: string;
  count: number;
  percentage: number;
}

export async function getContentTypeBreakdown(
  startDate?: Date,
  endDate?: Date
): Promise<ContentTypeBreakdown[]> {
  const dateFilter = buildDateFilter(startDate, endDate);

  const byTargetType = await prisma.report.groupBy({
    by: ['targetType'],
    _count: { id: true },
    where: { createdAt: dateFilter },
  });

  // Also count review reports as CONTENT type
  const reviewCount = await prisma.reviewReport.count({
    where: { createdAt: dateFilter },
  });

  const typeCounts: Record<string, number> = {};
  const contentCount = reviewCount;

  for (const r of byTargetType) {
    typeCounts[r.targetType] = r._count.id;
  }

  // Review reports are a type of content
  typeCounts['REVIEW'] = reviewCount;

  const total = Object.values(typeCounts).reduce((sum, c) => sum + c, 0);

  return Object.entries(typeCounts)
    .map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

// ============================================
// Moderation efficiency metrics
// ============================================

export interface ModerationEfficiency {
  averageTimeToFirstReviewHours: number;
  averageTimeToResolutionHours: number;
  resolutionRate: number;
  backlogSize: number;
}

export async function getModerationEfficiency(
  startDate?: Date,
  endDate?: Date
): Promise<ModerationEfficiency> {
  const dateFilter = buildDateFilter(startDate, endDate);
  const queueWhere = dateFilter ? { createdAt: dateFilter } : {};

  // Backlog: pending items in queue
  const backlogSize = await prisma.moderationQueueItem.count({
    where: {
      ...queueWhere,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
  });

  // Average time to first review: from createdAt to first ReviewModerationLog
  const logs = await prisma.reviewModerationLog.findMany({
    where: dateFilter ? { createdAt: dateFilter } : {},
    select: { reviewId: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // Group by reviewId and take first log time
  const firstLogsByReview: Record<string, Date> = {};
  for (const log of logs) {
    if (!firstLogsByReview[log.reviewId]) {
      firstLogsByReview[log.reviewId] = log.createdAt;
    }
  }

  let avgTimeToFirstReviewHours = 0;
  if (Object.keys(firstLogsByReview).length > 0) {
    // We would need createdAt of the review — approximate using queue creation
    const queueItems = await prisma.moderationQueueItem.findMany({
      where: queueWhere,
      select: { createdAt: true, status: true, updatedAt: true },
    });

    const resolvedItems = queueItems.filter(
      (i) => i.status === 'RESOLVED' || i.status === 'ESCALATED'
    );

    if (resolvedItems.length > 0) {
      const totalMs = resolvedItems.reduce((sum, i) => {
        return sum + (i.updatedAt.getTime() - i.createdAt.getTime());
      }, 0);
      avgTimeToFirstReviewHours = totalMs / resolvedItems.length / (1000 * 60 * 60);
    }
  }

  // Average time to resolution from queue items
  const resolvedQueueItems = await prisma.moderationQueueItem.findMany({
    where: {
      ...queueWhere,
      status: 'RESOLVED',
    },
    select: { createdAt: true, updatedAt: true },
  });

  let avgTimeToResolutionHours = 0;
  if (resolvedQueueItems.length > 0) {
    const totalMs = resolvedQueueItems.reduce((sum, i) => {
      return sum + (i.updatedAt.getTime() - i.createdAt.getTime());
    }, 0);
    avgTimeToResolutionHours = totalMs / resolvedQueueItems.length / (1000 * 60 * 60);
  }

  // Resolution rate: resolved / (resolved + dismissed)
  const resolved = await prisma.report.count({
    where: { ...dateFilter, status: 'RESOLVED' },
  });
  const dismissed = await prisma.report.count({
    where: { ...dateFilter, status: 'DISMISSED' },
  });
  const reviewResolved = await prisma.reviewReport.count({
    where: { ...dateFilter, status: 'RESOLVED' },
  });
  const reviewDismissed = await prisma.reviewReport.count({
    where: { ...dateFilter, status: 'DISMISSED' },
  });

  const totalProcessed = resolved + dismissed + reviewResolved + reviewDismissed;
  const resolutionRate =
    totalProcessed > 0
      ? Math.round(((resolved + reviewResolved) / totalProcessed) * 10000) / 100
      : 0;

  return {
    averageTimeToFirstReviewHours: Math.round(avgTimeToFirstReviewHours * 100) / 100,
    averageTimeToResolutionHours: Math.round(avgTimeToResolutionHours * 100) / 100,
    resolutionRate,
    backlogSize,
  };
}

// ============================================
// Report accuracy
// ============================================

export interface ReportAccuracy {
  reportsLeadingToAction: number;
  dismissedReports: number;
  falsePositiveRate: number;
}

export async function getReportAccuracy(
  startDate?: Date,
  endDate?: Date
): Promise<ReportAccuracy> {
  const dateFilter = buildDateFilter(startDate, endDate);

  const resolved = await prisma.report.count({
    where: { ...dateFilter, status: 'RESOLVED' },
  });
  const dismissed = await prisma.report.count({
    where: { ...dateFilter, status: 'DISMISSED' },
  });

  const reviewResolved = await prisma.reviewReport.count({
    where: { ...dateFilter, status: 'RESOLVED' },
  });
  const reviewDismissed = await prisma.reviewReport.count({
    where: { ...dateFilter, status: 'DISMISSED' },
  });

  const reportsLeadingToAction = resolved + reviewResolved;
  const dismissedReports = dismissed + reviewDismissed;
  const totalProcessed = reportsLeadingToAction + dismissedReports;

  const falsePositiveRate =
    totalProcessed > 0
      ? Math.round((dismissedReports / totalProcessed) * 10000) / 100
      : 0;

  return {
    reportsLeadingToAction,
    dismissedReports,
    falsePositiveRate,
  };
}

// ============================================
// Moderator performance
// ============================================

export interface ModeratorPerformance {
  moderatorId: string;
  totalReviewed: number;
  resolvedCount: number;
  dismissedCount: number;
  averageReviewTimeHours: number;
}

export async function getModeratorPerformance(
  moderatorId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<ModeratorPerformance[]> {
  const dateFilter = buildDateFilter(startDate, endDate);

  // Moderator can be identified via handledBy on reports
  const reportFilter: any = {
    ...(dateFilter ? { createdAt: dateFilter } : {}),
    status: { in: ['RESOLVED', 'DISMISSED'] },
  };
  if (moderatorId) {
    reportFilter.handledBy = moderatorId;
  }

  const reports = await prisma.report.findMany({
    where: reportFilter,
    select: { handledBy: true, status: true, createdAt: true, handledAt: true },
  });

  // Review reports
  const reviewReportFilter: any = {
    ...(dateFilter ? { createdAt: dateFilter } : {}),
    status: { in: ['RESOLVED', 'DISMISSED'] },
  };
  if (moderatorId) {
    reviewReportFilter.handledBy = moderatorId;
  }

  const reviewReports = await prisma.reviewReport.findMany({
    where: reviewReportFilter,
    select: { handledBy: true, status: true, createdAt: true, handledAt: true },
  });

  // Also via assignedTo on queue items
  const queueFilter: any = {
    ...(dateFilter ? { createdAt: dateFilter } : {}),
    status: 'RESOLVED',
  };
  if (moderatorId) {
    queueFilter.assignedTo = moderatorId;
  }

  const queueItems = await prisma.moderationQueueItem.findMany({
    where: queueFilter,
    select: { assignedTo: true, createdAt: true, updatedAt: true },
  });

  // Aggregate by moderator
  const moderatorStats: Record<
    string,
    { total: number; resolved: number; dismissed: number; totalTimeMs: number }
  > = {};

  for (const r of reports) {
    if (!r.handledBy) continue;
    if (!moderatorStats[r.handledBy]) {
      moderatorStats[r.handledBy] = { total: 0, resolved: 0, dismissed: 0, totalTimeMs: 0 };
    }
    moderatorStats[r.handledBy].total++;
    if (r.status === 'RESOLVED') moderatorStats[r.handledBy].resolved++;
    else if (r.status === 'DISMISSED') moderatorStats[r.handledBy].dismissed++;
    if (r.handledAt) {
      moderatorStats[r.handledBy].totalTimeMs +=
        r.handledAt.getTime() - r.createdAt.getTime();
    }
  }

  for (const r of reviewReports) {
    if (!r.handledBy) continue;
    if (!moderatorStats[r.handledBy]) {
      moderatorStats[r.handledBy] = { total: 0, resolved: 0, dismissed: 0, totalTimeMs: 0 };
    }
    moderatorStats[r.handledBy].total++;
    if (r.status === 'RESOLVED') moderatorStats[r.handledBy].resolved++;
    else if (r.status === 'DISMISSED') moderatorStats[r.handledBy].dismissed++;
    if (r.handledAt) {
      moderatorStats[r.handledBy].totalTimeMs +=
        r.handledAt.getTime() - r.createdAt.getTime();
    }
  }

  for (const q of queueItems) {
    if (!q.assignedTo) continue;
    if (!moderatorStats[q.assignedTo]) {
      moderatorStats[q.assignedTo] = { total: 0, resolved: 0, dismissed: 0, totalTimeMs: 0 };
    }
    moderatorStats[q.assignedTo].total++;
    moderatorStats[q.assignedTo].resolved++;
    moderatorStats[q.assignedTo].totalTimeMs +=
      q.updatedAt.getTime() - q.createdAt.getTime();
  }

  return Object.entries(moderatorStats)
    .map(([mid, stats]) => ({
      moderatorId: mid,
      totalReviewed: stats.total,
      resolvedCount: stats.resolved,
      dismissedCount: stats.dismissed,
      averageReviewTimeHours:
        stats.total > 0
          ? Math.round((stats.totalTimeMs / stats.total / (1000 * 60 * 60)) * 100) / 100
          : 0,
    }))
    .sort((a, b) => b.totalReviewed - a.totalReviewed);
}
