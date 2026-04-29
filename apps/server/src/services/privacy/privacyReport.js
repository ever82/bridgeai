/**
 * Privacy Report Service
 * Generates comprehensive privacy reports with detection logs, risk ratings, and comparisons
 */
import { calculatePrivacyRisk, getRiskLevel } from '../ai/sensitiveContentDetection';
/**
 * Generate a comprehensive privacy report
 */
export function generatePrivacyReport(imageId, userId, detections, appliedRegions, processingSteps, originalSize, processedSize, templateUsed = 'standard') {
    const reportId = `report-${Date.now()}-${imageId}`;
    const now = new Date();
    // Calculate risk score
    const riskScore = calculatePrivacyRisk(detections);
    const riskLevel = getRiskLevel(riskScore);
    // Create detected items
    const detectedItems = detections.map((detection, index) => {
        const appliedRegion = appliedRegions.find((r) => r.boundingBox.x === detection.boundingBox.x &&
            r.boundingBox.y === detection.boundingBox.y);
        return {
            id: `item-${index}`,
            type: detection.type,
            boundingBox: detection.boundingBox,
            confidence: detection.confidence,
            status: appliedRegion ? 'processed' : 'detected',
            method: appliedRegion?.method,
            intensity: appliedRegion?.intensity,
            metadata: detection.metadata,
        };
    });
    // Create processing log
    const processingLog = processingSteps.map((step) => ({
        timestamp: new Date(now.getTime() - step.duration),
        action: step.step,
        details: step.details || {},
        duration: step.duration,
    }));
    // Add initial detection log
    processingLog.unshift({
        timestamp: now,
        action: 'sensitive-content-detection',
        details: { detectionsFound: detections.length },
    });
    // Calculate risk breakdown
    const riskBreakdown = calculateRiskBreakdown(detections);
    // Generate recommendations
    const recommendations = generateRiskRecommendations(detections, riskLevel);
    // Calculate comparison metrics
    const sizeChange = originalSize > 0
        ? Math.round(((processedSize - originalSize) / originalSize) * 100)
        : 0;
    const totalProcessingTime = processingSteps.reduce((sum, step) => sum + step.duration, 0);
    return {
        id: reportId,
        imageId,
        userId,
        createdAt: now,
        summary: {
            totalDetections: detections.length,
            processedRegions: appliedRegions.length,
            riskLevel,
            riskScore,
            processingTime: totalProcessingTime,
            templateUsed,
        },
        detectedItems,
        processingLog,
        riskAssessment: {
            overallScore: riskScore,
            level: riskLevel,
            breakdown: riskBreakdown,
            recommendations,
        },
        comparison: {
            hasComparison: true,
            originalSize,
            processedSize,
            sizeChange,
            regionsChanged: appliedRegions.length,
            visualDiffScore: calculateVisualDiffScore(appliedRegions),
        },
        exportData: {
            jsonData: JSON.stringify({
                reportId,
                imageId,
                summary: { totalDetections: detections.length, riskLevel, riskScore },
                detectedItems: detections.map((d) => ({ type: d.type, confidence: d.confidence })),
            }),
        },
    };
}
/**
 * Calculate risk breakdown by type
 */
function calculateRiskBreakdown(detections) {
    const typeCounts = new Map();
    for (const detection of detections) {
        const existing = typeCounts.get(detection.type);
        if (existing) {
            existing.count++;
            existing.confidence += detection.confidence;
        }
        else {
            typeCounts.set(detection.type, { count: 1, confidence: detection.confidence });
        }
    }
    const weights = {
        face: 0.9,
        license_plate: 0.8,
        address: 0.85,
        text: 0.5,
        sensitive_object: 0.75,
        qr_code: 0.6,
        barcode: 0.4,
    };
    return Array.from(typeCounts.entries()).map(([type, data]) => ({
        type,
        count: data.count,
        score: Math.round((data.confidence / data.count) * 100),
        weight: weights[type] || 0.5,
    }));
}
/**
 * Generate risk-based recommendations
 */
function generateRiskRecommendations(detections, riskLevel) {
    const recommendations = [];
    if (riskLevel === 'critical' || riskLevel === 'high') {
        recommendations.push({
            priority: 'high',
            message: 'Multiple sensitive elements detected. Review all regions carefully.',
            action: 'manual-review',
        });
    }
    const hasFaces = detections.some((d) => d.type === 'face');
    if (hasFaces) {
        recommendations.push({
            priority: 'high',
            message: 'Faces detected. Ensure all individuals are properly consenting to sharing.',
            action: 'verify-consent',
        });
    }
    const hasPlates = detections.some((d) => d.type === 'license_plate');
    if (hasPlates) {
        recommendations.push({
            priority: 'medium',
            message: 'License plates detected. These have been desensitized to protect vehicle owner privacy.',
        });
    }
    const hasAddresses = detections.some((d) => d.type === 'address');
    if (hasAddresses) {
        recommendations.push({
            priority: 'medium',
            message: 'Location information detected. Consider if precise location needs to be shared.',
            action: 'review-location',
        });
    }
    const highConfidenceDetections = detections.filter((d) => d.confidence > 0.9);
    if (highConfidenceDetections.length > 0) {
        recommendations.push({
            priority: 'low',
            message: `${highConfidenceDetections.length} items detected with very high confidence. Auto-processing applied.`,
        });
    }
    return recommendations;
}
/**
 * Calculate visual difference score based on applied regions
 */
function calculateVisualDiffScore(appliedRegions) {
    if (appliedRegions.length === 0)
        return 0;
    // Calculate total affected area
    let totalAffectedArea = 0;
    let totalIntensity = 0;
    for (const region of appliedRegions) {
        const area = region.boundingBox.width * region.boundingBox.height;
        totalAffectedArea += area;
        totalIntensity += region.intensity;
    }
    const avgIntensity = totalIntensity / appliedRegions.length;
    // Assume 1920x1080 image for calculation
    const imageArea = 1920 * 1080;
    const coveragePercentage = (totalAffectedArea / imageArea) * 100;
    // Visual diff is based on coverage and intensity
    return Math.min(100, Math.round(coveragePercentage * (avgIntensity / 100) * 2));
}
/**
 * Export report as JSON
 */
export function exportReportAsJson(report) {
    return JSON.stringify(report, null, 2);
}
/**
 * Export report summary as text
 */
export function exportReportAsText(report) {
    const lines = [
        'PRIVACY REPORT',
        '='.repeat(50),
        `Report ID: ${report.id}`,
        `Image ID: ${report.imageId}`,
        `Generated: ${report.createdAt.toISOString()}`,
        '',
        'SUMMARY',
        '-'.repeat(50),
        `Total Detections: ${report.summary.totalDetections}`,
        `Processed Regions: ${report.summary.processedRegions}`,
        `Risk Level: ${report.summary.riskLevel.toUpperCase()}`,
        `Risk Score: ${report.summary.riskScore}/100`,
        `Processing Time: ${report.summary.processingTime}ms`,
        '',
        'DETECTED ITEMS',
        '-'.repeat(50),
    ];
    for (const item of report.detectedItems) {
        lines.push(`  [${item.type.toUpperCase()}] Confidence: ${Math.round(item.confidence * 100)}%`, `    Status: ${item.status}`, item.method ? `    Method: ${item.method}` : '', item.intensity ? `    Intensity: ${item.intensity}%` : '', '');
    }
    lines.push('RISK ASSESSMENT', '-'.repeat(50), `Overall Score: ${report.riskAssessment.overallScore}/100`, `Level: ${report.riskAssessment.level}`, '', 'Breakdown:');
    for (const breakdown of report.riskAssessment.breakdown) {
        lines.push(`  ${breakdown.type}: ${breakdown.count} items, score ${breakdown.score} (weight: ${breakdown.weight})`);
    }
    lines.push('', 'RECOMMENDATIONS', '-'.repeat(50));
    for (const rec of report.riskAssessment.recommendations) {
        lines.push(`  [${rec.priority.toUpperCase()}] ${rec.message}`);
        if (rec.action) {
            lines.push(`    Action: ${rec.action}`);
        }
    }
    lines.push('', 'COMPARISON', '-'.repeat(50), `Original Size: ${formatBytes(report.comparison.originalSize)}`, `Processed Size: ${formatBytes(report.comparison.processedSize)}`, `Size Change: ${report.comparison.sizeChange > 0 ? '+' : ''}${report.comparison.sizeChange}%`, `Regions Changed: ${report.comparison.regionsChanged}`, `Visual Difference: ${report.comparison.visualDiffScore}%`, '', '='.repeat(50), 'End of Report');
    return lines.filter((l) => l !== '').join('\n');
}
/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
/**
 * Generate share token for report
 */
export function generateShareToken(reportId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `share-${reportId}-${timestamp}-${random}`;
}
/**
 * Create a summary report from full report
 */
export function createSummaryReport(report) {
    return {
        id: report.id,
        imageId: report.imageId,
        createdAt: report.createdAt,
        summary: report.summary,
        riskAssessment: {
            overallScore: report.riskAssessment.overallScore,
            level: report.riskAssessment.level,
            breakdown: report.riskAssessment.breakdown.slice(0, 3), // Top 3 types only
            recommendations: report.riskAssessment.recommendations.filter((r) => r.priority === 'high'),
        },
        comparison: {
            hasComparison: report.comparison.hasComparison,
            regionsChanged: report.comparison.regionsChanged,
            visualDiffScore: report.comparison.visualDiffScore,
        },
    };
}
/**
 * Batch generate reports for multiple images
 */
export function batchGenerateReports(reportsData) {
    return reportsData.map((data) => generatePrivacyReport(data.imageId, data.userId, data.detections, data.appliedRegions, data.processingSteps, data.originalSize, data.processedSize));
}
/**
 * Get statistics from multiple reports
 */
export function getReportsStatistics(reports) {
    if (reports.length === 0) {
        return {
            totalReports: 0,
            avgRiskScore: 0,
            riskLevelDistribution: {},
            totalDetections: 0,
            avgProcessingTime: 0,
        };
    }
    const totalDetections = reports.reduce((sum, r) => sum + r.summary.totalDetections, 0);
    const avgRiskScore = Math.round(reports.reduce((sum, r) => sum + r.summary.riskScore, 0) / reports.length);
    const avgProcessingTime = Math.round(reports.reduce((sum, r) => sum + r.summary.processingTime, 0) / reports.length);
    const riskLevelDistribution = {};
    for (const report of reports) {
        const level = report.summary.riskLevel;
        riskLevelDistribution[level] = (riskLevelDistribution[level] || 0) + 1;
    }
    return {
        totalReports: reports.length,
        avgRiskScore,
        riskLevelDistribution,
        totalDetections,
        avgProcessingTime,
    };
}
//# sourceMappingURL=privacyReport.js.map