/**
 * L3 Natural Language Input Component
 * 自由文本输入组件 - L3自然语言信息模型
 *
 * Allows users to describe their needs in free text,
 * and AI extracts structured L2 data from it.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { useAIExtraction } from '../../hooks/useAIExtraction';
import { useTheme } from '../../hooks/useTheme';
import { ExtractionResult } from '../../services/ai/extractionService';

interface NaturalLanguageInputProps {
  /** Scene type for extraction (e.g., 'visionshare', 'agentjob', 'agentad') */
  scene: string;
  /** Callback when extraction is confirmed */
  onConfirm: (l2Data: Record<string, unknown>, confidence: number) => void;
  /** Callback when user wants to edit raw text */
  onEdit?: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Maximum text length */
  maxLength?: number;
  /** Show extraction preview */
  showPreview?: boolean;
  /** Initial text value */
  initialValue?: string;
}

interface ExtractedFieldPreview {
  field: string;
  value: unknown;
  confidence: number;
  label: string;
}

export const NaturalLanguageInput: React.FC<NaturalLanguageInputProps> = ({
  scene,
  onConfirm,
  onEdit,
  placeholder = '用自然语言描述您的需求... 例如：我想找一位周末有时间的人像摄影师，预算在2000元左右，地点在朝阳区',
  maxLength = 2000,
  showPreview = true,
  initialValue = '',
}) => {
  const [text, setText] = useState(initialValue);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const { extractFromText } = useAIExtraction();
  const { theme } = useTheme();

  // Extract structured data from text
  const handleExtract = useCallback(async () => {
    if (!text.trim() || text.trim().length < 10) {
      setError('请输入更多内容以便AI提取信息（至少10个字符）');
      return;
    }

    setError(null);
    setIsExtracting(true);
    setExtractionResult(null);

    try {
      const result = await extractFromText(text, scene, {
        requireClarification: true,
        extractEntities: true,
        classifyIntent: true,
      });

      setExtractionResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提取失败，请重试');
    } finally {
      setIsExtracting(false);
    }
  }, [text, scene, extractFromText]);

  // Confirm extraction and proceed
  const handleConfirm = useCallback(() => {
    if (extractionResult && extractionResult.success) {
      Keyboard.dismiss();
      onConfirm(extractionResult.data, extractionResult.confidence);
    }
  }, [extractionResult, onConfirm]);

  // Clear extraction and allow re-editing
  const handleClearExtraction = useCallback(() => {
    setExtractionResult(null);
    setError(null);
    inputRef.current?.focus();
  }, []);

  // Render field preview items
  const renderFieldPreview = (fields: ExtractedFieldPreview[]) => {
    if (!fields || fields.length === 0) return null;

    return (
      <View style={styles.previewContainer}>
        <Text style={[styles.previewTitle, { color: theme.colors.text }]}>
          提取结果预览
        </Text>
        {fields.map((field, index) => (
          <View key={index} style={styles.previewField}>
            <View style={styles.previewFieldHeader}>
              <Text style={[styles.previewFieldLabel, { color: theme.colors.textSecondary }]}>
                {field.label}
              </Text>
              <View
                style={[
                  styles.confidenceBadge,
                  {
                    backgroundColor:
                      field.confidence >= 0.8
                        ? '#4CAF50'
                        : field.confidence >= 0.5
                        ? '#FF9800'
                        : '#F44336',
                  },
                ]}
              >
                <Text style={styles.confidenceText}>
                  {Math.round(field.confidence * 100)}%
                </Text>
              </View>
            </View>
            <Text style={[styles.previewFieldValue, { color: theme.colors.text }]}>
              {formatFieldValue(field.value)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  // Get extracted fields for preview
  const getExtractedFields = (): ExtractedFieldPreview[] => {
    if (!extractionResult?.data) return [];

    const fieldLabels: Record<string, string> = {
      budget: '预算',
      location: '地点',
      time: '时间',
      photographyType: '摄影类型',
      style: '风格',
      experience: '经验',
      equipment: '设备',
      qualifications: '资质',
    };

    const fields: ExtractedFieldPreview[] = [];

    for (const [key, value] of Object.entries(extractionResult.data)) {
      if (value !== undefined && value !== null) {
        fields.push({
          field: key,
          value,
          confidence: extractionResult.confidence / 100,
          label: fieldLabels[key] || key,
        });
      }
    }

    return fields;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={[
            styles.textInput,
            {
              color: theme.colors.text,
              backgroundColor: theme.colors.surface,
              borderColor: error ? '#F44336' : theme.colors.border,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          value={text}
          onChangeText={(newText) => {
            setText(newText);
            setError(null);
          }}
          multiline
          maxLength={maxLength}
          textAlignVertical="top"
          editable={!isExtracting && !extractionResult}
        />

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.charCountContainer}>
          <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>
            {[...text].length}/{maxLength}
          </Text>
        </View>

        {!extractionResult ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { borderColor: theme.colors.border }]}
              onPress={() => {
                setText('');
                setError(null);
              }}
              disabled={isExtracting || !text}
            >
              <Text style={[styles.buttonText, { color: theme.colors.text }]}>清空</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                {
                  backgroundColor:
                    text.trim().length >= 10 ? theme.colors.primary : theme.colors.disabled,
                },
              ]}
              onPress={handleExtract}
              disabled={isExtracting || text.trim().length < 10}
            >
              {isExtracting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                  AI智能提取
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.extractionResultContainer}>
            {showPreview && renderFieldPreview(getExtractedFields())}

            <View style={styles.confidenceContainer}>
              <Text style={[styles.confidenceLabel, { color: theme.colors.textSecondary }]}>
                整体置信度
              </Text>
              <View style={styles.confidenceBar}>
                <View
                  style={[
                    styles.confidenceFill,
                    {
                      width: `${extractionResult.confidence}%`,
                      backgroundColor:
                        extractionResult.confidence >= 80
                          ? '#4CAF50'
                          : extractionResult.confidence >= 50
                          ? '#FF9800'
                          : '#F44336',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.confidenceValue, { color: theme.colors.text }]}>
                {extractionResult.confidence}%
              </Text>
            </View>

            <View style={styles.actionButtons}>
              {onEdit && (
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton, { borderColor: theme.colors.border }]}
                  onPress={() => {
                    handleClearExtraction();
                    onEdit();
                  }}
                >
                  <Text style={[styles.buttonText, { color: theme.colors.text }]}>重新编辑</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.secondaryButton,
                  { borderColor: theme.colors.border, marginRight: 8 },
                ]}
                onPress={handleClearExtraction}
              >
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>取消</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.primaryButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={handleConfirm}
              >
                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>确认</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

// Helper function to format field values for display
function formatFieldValue(value: unknown): string {
  if (value === undefined || value === null) return '未提取';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (Array.isArray(value)) return value.join('、');
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(', ');
  }
  return JSON.stringify(value);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputContainer: {
    padding: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 150,
    maxHeight: 300,
    fontSize: 16,
    lineHeight: 24,
  },
  errorContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
  },
  charCountContainer: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  charCount: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  extractionResultContainer: {
    marginTop: 16,
  },
  previewContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  previewField: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  previewFieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewFieldLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  confidenceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  previewFieldValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  confidenceLabel: {
    fontSize: 14,
  },
  confidenceBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 45,
    textAlign: 'right',
  },
});

export default NaturalLanguageInput;
