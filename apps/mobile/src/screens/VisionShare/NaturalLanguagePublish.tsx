/**
 * L3 Natural Language Publish Screen
 * 自然语言发布页面 - L3自然语言信息模型
 *
 * Users can describe their needs in free text,
 * and AI extracts structured information.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { NaturalLanguageInput } from '../../components/NaturalLanguageInput';
import { useTheme } from '../../hooks/useTheme';

// Minimal navigation type to avoid import issues
type VisionShareStackParamList = {
  NaturalLanguagePublish: { scene?: string };
  PublishScreen: { prefillData?: Record<string, unknown>; extractionConfidence?: number };
};

type Props = NativeStackScreenProps<VisionShareStackParamList, 'NaturalLanguagePublish'>;

export const NaturalLanguagePublishScreen: React.FC<Props> = ({ navigation, route }) => {
  const { scene = 'visionshare' } = route.params || {};
  const { theme } = useTheme();

  // Handle confirmation of extraction
  const handleConfirm = useCallback(
    (l2Data: Record<string, unknown>, conf: number) => {
      // Navigate to structured publish with extracted data
      navigation.navigate('PublishScreen', {
        prefillData: l2Data,
        extractionConfidence: conf,
      });
    },
    [navigation]
  );

  // Handle edit request
  const handleEdit = useCallback(() => {
    // Allow user to continue editing
  }, []);

  // Skip natural language and go directly to structured form
  const handleSkipToForm = useCallback(() => {
    navigation.navigate('PublishScreen', {});
  }, [navigation]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            用自然语言描述您的需求
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            AI智能识别并提取结构化信息
          </Text>
        </View>

        {/* Examples */}
        <View style={[styles.examplesContainer, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.examplesTitle, { color: theme.colors.textSecondary }]}>
            示例：
          </Text>
          <Text style={[styles.exampleText, { color: theme.colors.textSecondary }]}>
            &ldquo;我想找一位有人像拍摄经验的摄影师，周末有时间，预算2000元左右，地点在朝阳区&rdquo;
          </Text>
        </View>

        {/* Natural Language Input */}
        <NaturalLanguageInput
          scene={scene}
          onConfirm={handleConfirm}
          onEdit={handleEdit}
          showPreview={true}
          placeholder="用自然语言描述您的需求..."
        />

        {/* Skip Option */}
        <View style={styles.skipContainer}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipToForm}
          >
            <Text style={[styles.skipButtonText, { color: theme.colors.textSecondary }]}>
              跳过，填写表单
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={[styles.tipsContainer, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.tipsTitle, { color: theme.colors.text }]}>
            提示
          </Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>&bull;</Text>
            <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
              描述越详细，提取越准确
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>&bull;</Text>
            <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
              可以包含：预算、地点、时间、类型、风格等
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>&bull;</Text>
            <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
              支持随时修改提取结果
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  examplesContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  skipContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontSize: 14,
  },
  tipsContainer: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: 14,
    marginRight: 8,
    color: '#2196F3',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default NaturalLanguagePublishScreen;
