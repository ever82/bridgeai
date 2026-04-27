import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { transactionApi } from '../../services/api/transactionApi';
import { theme } from '../../theme';

const REFUND_REASONS = [
  { key: 'quality', label: '内容质量问题' },
  { key: 'duplicate', label: '重复扣费' },
  { key: 'unauthorized', label: '非本人操作' },
  { key: 'not_received', label: '未收到服务' },
  { key: 'other', label: '其他原因' },
];

export const CreateRefundScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { transactionId } = route.params as { transactionId: string };

  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('提示', '请选择退款原因');
      return;
    }

    const reasonLabel = REFUND_REASONS.find(r => r.key === selectedReason)?.label || selectedReason;

    setSubmitting(true);
    try {
      const res = await transactionApi.createRefund({
        transactionId,
        reason: reasonLabel,
        details: details.trim() || undefined,
      });

      if (res.success) {
        Alert.alert('成功', '退款申请已提交', [
          {
            text: '确定',
            onPress: () => navigation.replace('RefundDetail', { refundId: res.data.id }),
          },
        ]);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '提交退款申请失败';
      Alert.alert('错误', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>申请退款</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>选择退款原因</Text>
        <View style={styles.reasonList}>
          {REFUND_REASONS.map(reason => (
            <TouchableOpacity
              key={reason.key}
              style={[styles.reasonItem, selectedReason === reason.key && styles.reasonItemActive]}
              onPress={() => setSelectedReason(reason.key)}
            >
              <View
                style={[
                  styles.radioOuter,
                  selectedReason === reason.key && styles.radioOuterActive,
                ]}
              >
                {selectedReason === reason.key && <View style={styles.radioInner} />}
              </View>
              <Text
                style={[
                  styles.reasonText,
                  selectedReason === reason.key && styles.reasonTextActive,
                ]}
              >
                {reason.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>补充说明（可选）</Text>
        <TextInput
          style={styles.textInput}
          placeholder="请详细描述退款原因..."
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          maxLength={1000}
          value={details}
          onChangeText={setDetails}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedReason || submitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedReason || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <Text style={styles.submitButtonText}>提交退款申请</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.base,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    fontSize: 28,
    color: theme.colors.primary,
    width: 32,
  },
  headerTitle: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    padding: theme.spacing.base,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.base,
  },
  reasonList: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xl,
    overflow: 'hidden',
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  reasonItemActive: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.base,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: theme.colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  reasonText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
  },
  reasonTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.fonts.weights.medium,
  },
  textInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.text,
    minHeight: 120,
    marginBottom: theme.spacing.xl,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.base,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: theme.colors.textInverse,
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
  },
});
