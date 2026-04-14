import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

interface DetectedItem {
  id: string;
  type: string;
  confidence: number;
  status: string;
  method?: string;
  intensity?: number;
}

interface PrivacySummary {
  totalDetections: number;
  processedRegions: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  processingTime: number;
  templateUsed: string;
}

interface RiskBreakdown {
  type: string;
  count: number;
  score: number;
  weight: number;
}

interface RiskRecommendation {
  priority: 'low' | 'medium' | 'high';
  message: string;
  action?: string;
}

interface RiskAssessment {
  overallScore: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  breakdown: RiskBreakdown[];
  recommendations: RiskRecommendation[];
}

interface BeforeAfterComparison {
  hasComparison: boolean;
  originalSize: number;
  processedSize: number;
  sizeChange: number;
  regionsChanged: number;
  visualDiffScore: number;
}

interface PrivacyReportData {
  id: string;
  imageId: string;
  createdAt: string;
  summary: PrivacySummary;
  detectedItems: DetectedItem[];
  riskAssessment: RiskAssessment;
  comparison: BeforeAfterComparison;
}

interface PrivacyReportViewProps {
  report: PrivacyReportData;
  onExport?: () => void;
  onShare?: () => void;
  onClose?: () => void;
}

const RISK_COLORS: Record<string, string> = {
  low: '#34C759',
  medium: '#FFCC00',
  high: '#FF8800',
  critical: '#FF4444',
};

const TYPE_LABELS: Record<string, string> = {
  face: 'Face',
  license_plate: 'License Plate',
  text: 'Text',
  address: 'Address',
  sensitive_object: 'Sensitive Object',
  qr_code: 'QR Code',
  barcode: 'Barcode',
};

const TYPE_ICONS: Record<string, string> = {
  face: '👤',
  license_plate: '🚗',
  text: '📝',
  address: '📍',
  sensitive_object: '⚠️',
  qr_code: '🔳',
  barcode: '┃┃┃',
};

export const PrivacyReportView: React.FC<PrivacyReportViewProps> = ({
  report,
  onExport,
  onShare,
  onClose,
}) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Privacy Report</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Summary</Text>
            <View
              style={[
                styles.riskBadge,
                { backgroundColor: RISK_COLORS[report.summary.riskLevel] },
              ]}
            >
              <Text style={styles.riskBadgeText}>
                {report.summary.riskLevel.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.summaryGrid}>
            <SummaryItem
              label="Risk Score"
              value={`${report.summary.riskScore}/100`}
              color={RISK_COLORS[report.summary.riskLevel]}
            />
            <SummaryItem
              label="Detections"
              value={report.summary.totalDetections.toString()}
            />
            <SummaryItem
              label="Processed"
              value={report.summary.processedRegions.toString()}
            />
            <SummaryItem
              label="Time"
              value={`${report.summary.processingTime}ms`}
            />
          </View>
        </View>

        {/* Risk Assessment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Risk Assessment</Text>
          <View style={styles.riskCard}>
            <View style={styles.riskScoreContainer}>
              <Text style={styles.riskScoreValue}>{report.riskAssessment.overallScore}</Text>
              <Text style={styles.riskScoreLabel}>Risk Score</Text>
            </View>
            <View style={styles.riskLevelContainer}>
              <Text style={[styles.riskLevel, { color: RISK_COLORS[report.riskAssessment.level] }]}>
                {report.riskAssessment.level.toUpperCase()} RISK
              </Text>
            </View>
          </View>

          {/* Risk Breakdown */}
          <Text style={styles.subSectionTitle}>Breakdown</Text>
          {report.riskAssessment.breakdown.map((item, index) => (
            <RiskBreakdownRow key={index} item={item} />
          ))}

          {/* Recommendations */}
          {report.riskAssessment.recommendations.length > 0 && (
            <>
              <Text style={styles.subSectionTitle}>Recommendations</Text>
              {report.riskAssessment.recommendations.map((rec, index) => (
                <RecommendationRow key={index} recommendation={rec} />
              ))}
            </>
          )}
        </View>

        {/* Detected Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detected Items</Text>
          {report.detectedItems.map((item) => (
            <DetectedItemRow key={item.id} item={item} />
          ))}
        </View>

        {/* Comparison */}
        {report.comparison.hasComparison && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Before/After Comparison</Text>
            <View style={styles.comparisonCard}>
              <ComparisonRow
                label="Original Size"
                value={formatBytes(report.comparison.originalSize)}
              />
              <ComparisonRow
                label="Processed Size"
                value={formatBytes(report.comparison.processedSize)}
              />
              <ComparisonRow
                label="Size Change"
                value={`${report.comparison.sizeChange > 0 ? '+' : ''}${report.comparison.sizeChange}%`}
                highlight={report.comparison.sizeChange !== 0}
              />
              <ComparisonRow
                label="Regions Changed"
                value={report.comparison.regionsChanged.toString()}
              />
              <ComparisonRow
                label="Visual Difference"
                value={`${report.comparison.visualDiffScore}%`}
              />
            </View>
          </View>
        )}

        {/* Report Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Information</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Report ID" value={report.id} />
            <InfoRow label="Image ID" value={report.imageId} />
            <InfoRow label="Generated" value={formatDate(report.createdAt)} />
            <InfoRow label="Template Used" value={report.summary.templateUsed} />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {onExport && (
            <TouchableOpacity style={styles.actionButton} onPress={onExport}>
              <Text style={styles.actionButtonIcon}>📥</Text>
              <Text style={styles.actionButtonText}>Export Report</Text>
            </TouchableOpacity>
          )}
          {onShare && (
            <TouchableOpacity style={[styles.actionButton, styles.shareButton]} onPress={onShare}>
              <Text style={styles.actionButtonIcon}>📤</Text>
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

// Sub-components
const SummaryItem: React.FC<{
  label: string;
  value: string;
  color?: string;
}> = ({ label, value, color }) => (
  <View style={styles.summaryItem}>
    <Text style={[styles.summaryValue, color && { color }]}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const RiskBreakdownRow: React.FC<{ item: RiskBreakdown }> = ({ item }) => (
  <View style={styles.breakdownRow}>
    <View style={styles.breakdownLeft}>
      <Text style={styles.breakdownType}>{TYPE_LABELS[item.type] || item.type}</Text>
      <Text style={styles.breakdownCount}>{item.count} items</Text>
    </View>
    <View style={styles.breakdownRight}>
      <Text style={styles.breakdownScore}>{item.score}</Text>
      <View style={styles.weightBar}>
        <View
          style={[
            styles.weightFill,
            { width: `${item.weight * 100}%` },
          ]}
        />
      </View>
    </View>
  </View>
);

const RecommendationRow: React.FC<{ recommendation: RiskRecommendation }> = ({
  recommendation,
}) => (
  <View style={styles.recommendationRow}>
    <View
      style={[
        styles.priorityIndicator,
        {
          backgroundColor:
            recommendation.priority === 'high'
              ? '#FF4444'
              : recommendation.priority === 'medium'
              ? '#FFCC00'
              : '#888',
        },
      ]}
    />
    <View style={styles.recommendationContent}>
      <Text style={styles.recommendationMessage}>{recommendation.message}</Text>
      {recommendation.action && (
        <Text style={styles.recommendationAction}>Action: {recommendation.action}</Text>
      )}
    </View>
  </View>
);

const DetectedItemRow: React.FC<{ item: DetectedItem }> = ({ item }) => (
  <View style={styles.itemRow}>
    <Text style={styles.itemIcon}>{TYPE_ICONS[item.type] || '•'}</Text>
    <View style={styles.itemInfo}>
      <Text style={styles.itemType}>{TYPE_LABELS[item.type] || item.type}</Text>
      <Text style={styles.itemStatus}>
        {item.status} {item.method && `• ${item.method}`}
        {item.intensity && ` @ ${item.intensity}%`}
      </Text>
    </View>
    <Text style={styles.itemConfidence}>{Math.round(item.confidence * 100)}%</Text>
  </View>
);

const ComparisonRow: React.FC<{
  label: string;
  value: string;
  highlight?: boolean;
}> = ({ label, value, highlight }) => (
  <View style={styles.comparisonRow}>
    <Text style={styles.comparisonLabel}>{label}</Text>
    <Text style={[styles.comparisonValue, highlight && styles.comparisonValueHighlight]}>
      {value}
    </Text>
  </View>
);

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    fontSize: 20,
    color: '#888',
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  riskBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryItem: {
    width: '50%',
    paddingVertical: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#aaa',
    marginTop: 12,
    marginBottom: 8,
  },
  riskCard: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
  },
  riskScoreContainer: {
    alignItems: 'center',
    marginRight: 20,
  },
  riskScoreValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  riskScoreLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  riskLevelContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  riskLevel: {
    fontSize: 18,
    fontWeight: '700',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  breakdownLeft: {
    flex: 1,
  },
  breakdownType: {
    fontSize: 14,
    color: '#fff',
  },
  breakdownCount: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  breakdownRight: {
    alignItems: 'flex-end',
  },
  breakdownScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  weightBar: {
    width: 60,
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
    marginTop: 4,
  },
  weightFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  recommendationRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  priorityIndicator: {
    width: 4,
    borderRadius: 2,
    marginRight: 10,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationMessage: {
    fontSize: 13,
    color: '#ccc',
    lineHeight: 18,
  },
  recommendationAction: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  itemIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  itemInfo: {
    flex: 1,
  },
  itemType: {
    fontSize: 14,
    color: '#fff',
  },
  itemStatus: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  itemConfidence: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  comparisonCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#aaa',
  },
  comparisonValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  comparisonValueHighlight: {
    color: '#007AFF',
  },
  infoCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  infoLabel: {
    fontSize: 13,
    color: '#888',
  },
  infoValue: {
    fontSize: 13,
    color: '#fff',
    flex: 1,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    margin: 16,
    marginTop: 8,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: '#333',
    borderRadius: 10,
  },
  shareButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

export default PrivacyReportView;
