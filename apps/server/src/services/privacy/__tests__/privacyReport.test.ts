/**
 * Privacy Report Service Tests
 */

import {
  generatePrivacyReport,
  exportReportAsJson,
  exportReportAsText,
  generateShareToken,
  createSummaryReport,
  batchGenerateReports,
  getReportsStatistics,
  PrivacyReport,
} from '../privacyReport';
import { DetectionResult } from '../../ai/sensitiveContentDetection';
import { DesensitizationRegion, ProcessingStep } from '../../image/desensitization';

function makeDetection(
  type: DetectionResult['type'] = 'face',
  confidence = 0.9,
  bbox = { x: 10, y: 10, width: 50, height: 50 }
): DetectionResult {
  return { type, boundingBox: bbox, confidence, metadata: {} };
}

function makeRegion(
  _type: DetectionResult['type'] = 'face',
  intensity = 80,
  bbox = { x: 10, y: 10, width: 50, height: 50 }
): DesensitizationRegion {
  return { boundingBox: bbox, method: 'blur', intensity };
}

function makeStep(name: string, duration = 100): ProcessingStep {
  return { step: name, duration, details: {} };
}

describe('Privacy Report Service', () => {
  describe('generatePrivacyReport', () => {
    it('should generate a report with all required fields', () => {
      const detections = [makeDetection('face', 0.95)];
      const regions = [makeRegion('face', 80)];
      const steps = [makeStep('pre-processing', 50), makeStep('post-processing', 50)];

      const report = generatePrivacyReport(
        'img-123',
        'user-456',
        detections,
        regions,
        steps,
        1000,
        900,
        'template-strict'
      );

      expect(report.id).toMatch(/^report-/);
      expect(report.imageId).toBe('img-123');
      expect(report.userId).toBe('user-456');
      expect(report.createdAt).toBeInstanceOf(Date);
      expect(report.summary).toBeDefined();
      expect(report.detectedItems).toBeDefined();
      expect(report.processingLog).toBeDefined();
      expect(report.riskAssessment).toBeDefined();
      expect(report.comparison).toBeDefined();
      expect(report.exportData).toBeDefined();
    });

    it('should calculate correct summary totals', () => {
      const detections = [makeDetection('face'), makeDetection('license_plate')];
      const regions = [makeRegion('face')];
      const steps = [makeStep('test', 150)];

      const report = generatePrivacyReport(
        'img-123',
        'user-456',
        detections,
        regions,
        steps,
        1000,
        800
      );

      expect(report.summary.totalDetections).toBe(2);
      expect(report.summary.processedRegions).toBe(1);
      expect(report.summary.processingTime).toBe(150);
    });

    it('should mark processed items correctly', () => {
      const detections = [
        makeDetection('face', 0.9, { x: 10, y: 10, width: 50, height: 50 }),
        makeDetection('license_plate', 0.9, { x: 200, y: 200, width: 50, height: 50 }),
      ];
      const regions = [makeRegion('face', 80, { x: 10, y: 10, width: 50, height: 50 })];
      const steps = [makeStep('test', 100)];

      const report = generatePrivacyReport(
        'img-123',
        'user-456',
        detections,
        regions,
        steps,
        1000,
        900
      );

      expect(report.detectedItems[0].status).toBe('processed');
      expect(report.detectedItems[1].status).toBe('detected');
    });

    it('should calculate risk score and level', () => {
      const detections = [makeDetection('face', 0.9)];
      const regions: DesensitizationRegion[] = [];
      const steps = [makeStep('test', 100)];

      const report = generatePrivacyReport(
        'img-123',
        'user-456',
        detections,
        regions,
        steps,
        1000,
        900
      );

      expect(report.summary.riskScore).toBeGreaterThan(0);
      expect(report.summary.riskLevel).toMatch(/^(low|medium|high|critical)$/);
      expect(report.riskAssessment.overallScore).toBe(report.summary.riskScore);
      expect(report.riskAssessment.level).toBe(report.summary.riskLevel);
    });

    it('should include risk breakdown by type', () => {
      const detections = [
        makeDetection('face', 0.9),
        makeDetection('face', 0.85),
        makeDetection('license_plate', 0.9),
      ];
      const regions: DesensitizationRegion[] = [];
      const steps = [makeStep('test', 100)];

      const report = generatePrivacyReport(
        'img-123',
        'user-456',
        detections,
        regions,
        steps,
        1000,
        900
      );

      expect(report.riskAssessment.breakdown.length).toBeGreaterThan(0);
      const faceBreakdown = report.riskAssessment.breakdown.find(b => b.type === 'face');
      expect(faceBreakdown?.count).toBe(2);
    });

    it('should calculate size change percentage', () => {
      const detections: DetectionResult[] = [];
      const regions: DesensitizationRegion[] = [];
      const steps = [makeStep('test', 100)];

      const report = generatePrivacyReport(
        'img-123',
        'user-456',
        detections,
        regions,
        steps,
        1000,
        1200
      );

      expect(report.comparison.originalSize).toBe(1000);
      expect(report.comparison.processedSize).toBe(1200);
      expect(report.comparison.sizeChange).toBe(20);
    });

    it('should include recommendations for high risk', () => {
      const detections = [makeDetection('face', 0.95), makeDetection('license_plate', 0.9)];
      const regions: DesensitizationRegion[] = [];
      const steps = [makeStep('test', 100)];

      const report = generatePrivacyReport(
        'img-123',
        'user-456',
        detections,
        regions,
        steps,
        1000,
        900
      );

      expect(report.riskAssessment.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle zero detections gracefully', () => {
      const report = generatePrivacyReport(
        'img-123',
        'user-456',
        [],
        [],
        [makeStep('test', 50)],
        500,
        500
      );

      expect(report.summary.totalDetections).toBe(0);
      expect(report.summary.riskScore).toBe(0);
      expect(report.summary.riskLevel).toBe('low');
    });
  });

  describe('exportReportAsJson', () => {
    it('should export report as valid JSON string', () => {
      const report = generatePrivacyReport(
        'img-123',
        'user-456',
        [makeDetection('face')],
        [makeRegion('face')],
        [makeStep('test', 100)],
        1000,
        900
      );

      const json = exportReportAsJson(report);
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe(report.id);
      expect(parsed.imageId).toBe(report.imageId);
    });
  });

  describe('exportReportAsText', () => {
    it('should export report as readable text', () => {
      const report = generatePrivacyReport(
        'img-123',
        'user-456',
        [makeDetection('face', 0.9)],
        [makeRegion('face', 80)],
        [makeStep('test', 100)],
        1000,
        900
      );

      const text = exportReportAsText(report);

      expect(text).toContain('PRIVACY REPORT');
      expect(text).toContain(report.id);
      expect(text).toContain('Total Detections: 1');
      expect(text).toContain('Risk Level:');
      expect(text).toContain('Face');
    });
  });

  describe('generateShareToken', () => {
    it('should generate unique share tokens', () => {
      const token1 = generateShareToken('report-123');
      const token2 = generateShareToken('report-123');

      expect(token1).toMatch(/^share-report-123-/);
      expect(token1).not.toBe(token2);
    });
  });

  describe('createSummaryReport', () => {
    it('should create a summary with only essential fields', () => {
      const report = generatePrivacyReport(
        'img-123',
        'user-456',
        [makeDetection('face'), makeDetection('license_plate')],
        [makeRegion('face')],
        [makeStep('test', 100)],
        1000,
        900
      );

      const summary = createSummaryReport(report);

      expect(summary.id).toBe(report.id);
      expect(summary.imageId).toBe(report.imageId);
      expect(summary.createdAt).toBe(report.createdAt);
      expect(summary.summary).toBeDefined();
      expect(summary.riskAssessment).toBeDefined();
    });
  });

  describe('batchGenerateReports', () => {
    it('should generate multiple reports', () => {
      const data = [
        {
          imageId: 'img-1',
          userId: 'user-1',
          detections: [makeDetection('face')],
          appliedRegions: [makeRegion('face')],
          processingSteps: [makeStep('test', 100)],
          originalSize: 1000,
          processedSize: 900,
        },
        {
          imageId: 'img-2',
          userId: 'user-1',
          detections: [makeDetection('license_plate')],
          appliedRegions: [makeRegion('license_plate')],
          processingSteps: [makeStep('test', 80)],
          originalSize: 800,
          processedSize: 750,
        },
      ];

      const reports = batchGenerateReports(data);

      expect(reports).toHaveLength(2);
      expect(reports[0].imageId).toBe('img-1');
      expect(reports[1].imageId).toBe('img-2');
    });
  });

  describe('getReportsStatistics', () => {
    it('should return zero values for empty reports', () => {
      const stats = getReportsStatistics([]);

      expect(stats.totalReports).toBe(0);
      expect(stats.avgRiskScore).toBe(0);
      expect(stats.totalDetections).toBe(0);
    });

    it('should calculate statistics for multiple reports', () => {
      const reports: PrivacyReport[] = [
        generatePrivacyReport(
          'img-1',
          'user-1',
          [makeDetection('face', 0.9)],
          [],
          [makeStep('test', 100)],
          1000,
          900
        ),
        generatePrivacyReport(
          'img-2',
          'user-1',
          [makeDetection('license_plate', 0.9)],
          [],
          [makeStep('test', 100)],
          1000,
          900
        ),
      ];

      const stats = getReportsStatistics(reports);

      expect(stats.totalReports).toBe(2);
      expect(stats.totalDetections).toBe(2);
      expect(stats.avgRiskScore).toBeGreaterThan(0);
      expect(stats.riskLevelDistribution).toBeDefined();
    });
  });
});
