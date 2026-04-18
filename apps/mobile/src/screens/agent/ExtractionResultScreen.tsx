import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { L2Schema, L2Data, L2FieldType, getL2Schema } from '@bridgeai/shared';
import { useNavigation } from '@react-navigation/native';

interface ExtractionResult {
  success: boolean;
  data: L2Data;
  confidence: number;
  fieldsExtracted: string[];
  fieldsFailed: string[];
  reasoning?: string;
}

interface ExtractionResultScreenProps {
  route: {
    params: {
      extraction: ExtractionResult;
      scene: string;
      originalText: string;
      agentId: string;
      onConfirm?: (data: L2Data) => void;
      onReject?: () => void;
      onEdit?: (data: L2Data) => void;
    };
  };
}

// Confidence badge component
interface ConfidenceBadgeProps {
  confidence: number;
}

const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ confidence }) => {
  let color = '#4CAF50';
  let label = '高置信度';

  if (confidence < 50) {
    color = '#FF5722';
    label = '低置信度';
  } else if (confidence < 80) {
    color = '#FFC107';
    label = '中等置信度';
  }

  return (
    <View style={[styles.confidenceBadge, { backgroundColor: color + '20' }]}>
      <View style={[styles.confidenceDot, { backgroundColor: color }]} />
      <Text style={[styles.confidenceText, { color }]}>
        {label} ({confidence}%)
      </Text>
    </View>
  );
};

// Field value display component
interface FieldValueProps {
  fieldId: string;
  value: unknown;
  schema: L2Schema;
}

const FieldValue: React.FC<FieldValueProps> = ({ fieldId, value, schema }) => {
  const field = schema.fields.find(f => f.id === fieldId);
  if (!field) return null;

  const getDisplayValue = () => {
    if (value === undefined || value === null) {
      return <Text style={styles.emptyValue}>未提取</Text>;
    }

    switch (field.type) {
      case L2FieldType.ENUM: {
        const option = field.options?.find(o => o.value === value);
        return <Text style={styles.fieldValue}>{option?.label || value}</Text>;
      }

      case L2FieldType.MULTI_SELECT:
        if (Array.isArray(value) && value.length > 0) {
          return (
            <View style={styles.tagsContainer}>
              {value.map((v, i) => {
                const opt = field.options?.find(o => o.value === v);
                return (
                  <View key={i} style={styles.tag}>
                    <Text style={styles.tagText}>{opt?.label || v}</Text>
                  </View>
                );
              })}
            </View>
          );
        }
        return <Text style={styles.emptyValue}>未选择</Text>;

      case L2FieldType.RANGE:
        if (typeof value === 'object') {
          return (
            <Text style={styles.fieldValue}>
              {value.min} - {value.max}
            </Text>
          );
        }
        return <Text style={styles.fieldValue}>{value}</Text>;

      case L2FieldType.BOOLEAN:
        return <Text style={styles.fieldValue}>{value ? '是' : '否'}</Text>;

      default:
        return <Text style={styles.fieldValue}>{String(value)}</Text>;
    }
  };

  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{field.label}</Text>
      {getDisplayValue()}
    </View>
  );
};

export const ExtractionResultScreen: React.FC<ExtractionResultScreenProps> = ({ route }) => {
  const { extraction, scene, originalText, onConfirm, onReject, onEdit } = route.params;
  const navigation = useNavigation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [editedData] = useState<L2Data>(extraction.data);

  const schema = getL2Schema(scene);

  const handleConfirm = useCallback(async () => {
    setIsProcessing(true);
    try {
      await onConfirm?.(editedData);
      navigation.goBack();
    } catch (error) {
      Alert.alert('错误', '确认失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  }, [editedData, onConfirm, navigation]);

  const handleReject = useCallback(() => {
    Alert.alert('重新提炼', '确定要放弃当前提炼结果并重新提炼吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '重新提炼',
        style: 'destructive',
        onPress: () => {
          onReject?.();
          navigation.goBack();
        },
      },
    ]);
  }, [onReject, navigation]);

  const handleEdit = useCallback(() => {
    onEdit?.(editedData);
  }, [editedData, onEdit]);

  const getSuccessRate = () => {
    const total = extraction.fieldsExtracted.length + extraction.fieldsFailed.length;
    if (total === 0) return 0;
    return Math.round((extraction.fieldsExtracted.length / total) * 100);
  };

  if (!schema) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>未找到场景配置</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI 提炼结果</Text>
        <ConfidenceBadge confidence={extraction.confidence} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>提炼概况</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{extraction.fieldsExtracted.length}</Text>
              <Text style={styles.summaryLabel}>成功字段</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{extraction.fieldsFailed.length}</Text>
              <Text style={styles.summaryLabel}>待补充</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{getSuccessRate()}%</Text>
              <Text style={styles.summaryLabel}>成功率</Text>
            </View>
          </View>
        </View>

        {/* Extracted Fields */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✓ 已提取信息</Text>
          {extraction.fieldsExtracted.map(fieldId => (
            <FieldValue
              key={fieldId}
              fieldId={fieldId}
              value={editedData[fieldId]}
              schema={schema}
            />
          ))}
        </View>

        {/* Failed Fields */}
        {extraction.fieldsFailed.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚠ 待补充信息</Text>
            {extraction.fieldsFailed.map(fieldId => {
              const field = schema.fields.find(f => f.id === fieldId);
              return (
                <View key={fieldId} style={styles.failedField}>
                  <Text style={styles.failedFieldLabel}>{field?.label || fieldId}</Text>
                  <Text style={styles.failedFieldHint}>AI 未能从文本中提取此信息</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Reasoning */}
        {extraction.reasoning && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 提炼说明</Text>
            <Text style={styles.reasoningText}>{extraction.reasoning}</Text>
          </View>
        )}

        {/* Original Text Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>原文预览</Text>
          <Text style={styles.originalText} numberOfLines={3}>
            {originalText}
          </Text>
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={handleReject}
          disabled={isProcessing}
        >
          <Text style={styles.rejectButtonText}>重新提炼</Text>
        </TouchableOpacity>

        {onEdit && (
          <TouchableOpacity style={styles.editButton} onPress={handleEdit} disabled={isProcessing}>
            <Text style={styles.editButtonText}>编辑</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>确认并保存</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  fieldLabel: {
    fontSize: 14,
    color: '#666',
  },
  fieldValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  emptyValue: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  tag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 4,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#1976d2',
  },
  failedField: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  failedFieldLabel: {
    fontSize: 14,
    color: '#666',
  },
  failedFieldHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  reasoningText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  originalText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  rejectButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  rejectButtonText: {
    fontSize: 14,
    color: '#666',
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#e3f2fd',
  },
  editButtonText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});
